import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' as material;
import 'package:shadcn_flutter/shadcn_flutter.dart';
import 'package:path_provider/path_provider.dart';
import '../../core/models/detection_report.dart';
import '../../services/anticheat/detection_engine.dart';
import 'package:intl/intl.dart';

class LogsScreen extends StatefulWidget {
  final DetectionEngine? detectionEngine;

  const LogsScreen({super.key, this.detectionEngine});

  @override
  State<LogsScreen> createState() => _LogsScreenState();
}

class _LogsScreenState extends State<LogsScreen> {
  late final DetectionEngine _detectionEngine;
  final List<DetectionReport> _allLogs = [];
  List<DetectionReport> _filteredLogs = [];
  StreamSubscription<List<DetectionReport>>? _detectionSubscription;

  String _searchQuery = '';
  CheatType? _selectedFilter = null; // Default to "All types"
  bool _sortNewestFirst = true;
  bool _isLoading = true;
  String? _logsFilePath;

  static const String _logsFileName = 'detection_logs.json';

  @override
  void initState() {
    super.initState();
    // Use provided DetectionEngine or create a new one
    _detectionEngine = widget.detectionEngine ?? DetectionEngine();

    if (kDebugMode) {
      _loadLogs();
      _listenToDetections();
    }
  }

  @override
  void dispose() {
    _detectionSubscription?.cancel();
    super.dispose();
  }

  /// Load logs from persistent storage
  Future<void> _loadLogs() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final appDir = await getApplicationSupportDirectory();
      final logsFile = File('${appDir.path}/$_logsFileName');
      _logsFilePath = logsFile.path;

      if (kDebugMode) {
        debugPrint('Loading logs from: ${logsFile.path}');
        debugPrint('File exists: ${await logsFile.exists()}');
      }

      if (await logsFile.exists()) {
        final content = await logsFile.readAsString();

        if (kDebugMode) {
          debugPrint('Logs file size: ${content.length} bytes');
        }

        if (content.trim().isEmpty) {
          if (kDebugMode) {
            debugPrint('Logs file is empty');
          }
          setState(() {
            _allLogs.clear();
            _filteredLogs.clear();
          });
          return;
        }

        final List<dynamic> jsonList = jsonDecode(content);
        final loadedLogs = jsonList
            .map((json) => DetectionReport.fromJson(json))
            .toList();

        if (kDebugMode) {
          debugPrint('Loaded ${loadedLogs.length} logs from file');
        }

        setState(() {
          _allLogs.clear();
          _allLogs.addAll(loadedLogs);
          _applyFilters();
        });
      } else {
        if (kDebugMode) {
          debugPrint('Logs file does not exist yet');
        }
        setState(() {
          _allLogs.clear();
          _filteredLogs.clear();
        });
      }
    } catch (e, stackTrace) {
      if (kDebugMode) {
        debugPrint('Error loading logs: $e');
        debugPrint('Stack trace: $stackTrace');
      }
      setState(() {
        _allLogs.clear();
        _filteredLogs.clear();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Save logs to persistent storage
  Future<void> _saveLogs() async {
    try {
      final appDir = await getApplicationSupportDirectory();
      final logsFile = File('${appDir.path}/$_logsFileName');

      final jsonList = _allLogs.map((log) => log.toJson()).toList();
      await logsFile.writeAsString(jsonEncode(jsonList));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error saving logs: $e');
      }
    }
  }

  /// Listen to new detections from the detection engine
  void _listenToDetections() {
    _detectionSubscription = _detectionEngine.detectionStream.listen((
      detections,
    ) {
      setState(() {
        _allLogs.addAll(detections);
        _applyFilters();
      });
      _saveLogs();
    });
  }

  /// Apply search and filter to logs
  void _applyFilters() {
    var filtered = List<DetectionReport>.from(_allLogs);

    // Apply cheat type filter
    if (_selectedFilter != null) {
      filtered = filtered.where((log) => log.type == _selectedFilter).toList();
    }

    // Apply search query
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((log) {
        return log.type.name.toLowerCase().contains(query) ||
            (log.processName?.toLowerCase().contains(query) ?? false) ||
            log.evidence.toString().toLowerCase().contains(query);
      }).toList();
    }

    // Sort by timestamp
    filtered.sort((a, b) {
      if (_sortNewestFirst) {
        return b.timestamp.compareTo(a.timestamp);
      } else {
        return a.timestamp.compareTo(b.timestamp);
      }
    });

    setState(() {
      _filteredLogs = filtered;
    });
  }

  /// Clear all logs
  Future<void> _clearLogs() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear All Logs'),
        content: const Text(
          'Are you sure you want to delete all detection logs? This action cannot be undone.',
        ),
        actions: [
          OutlineButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          PrimaryButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Clear'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() {
        _allLogs.clear();
        _filteredLogs.clear();
      });
      await _saveLogs();
    }
  }

  /// Export logs to a file
  Future<void> _exportLogs() async {
    try {
      final appDir = await getApplicationSupportDirectory();
      final exportFile = File(
        '${appDir.path}/detection_logs_export_${DateTime.now().millisecondsSinceEpoch}.json',
      );

      final jsonList = _allLogs.map((log) => log.toJson()).toList();
      await exportFile.writeAsString(
        const JsonEncoder.withIndent('  ').convert(jsonList),
      );

      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Export Successful'),
            content: Text('Logs exported to:\n${exportFile.path}'),
            actions: [
              PrimaryButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Export Failed'),
            content: Text('Error exporting logs: $e'),
            actions: [
              PrimaryButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Check if in debug mode - show message if not
    if (!kDebugMode) {
      return Scaffold(
        headers: [
          AppBar(
            title: const Text('Detection Logs'),
            leading: Navigator.of(context).canPop()
                ? [
                    Button(
                      style: const ButtonStyle.ghost(),
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Icon(Icons.arrow_back),
                    ),
                  ]
                : [],
          ),
        ],
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.lock_outline,
                size: 64,
                color: Color(0xFF9E9E9E),
              ),
              const SizedBox(height: 16),
              const Text(
                'Logs are only available in debug mode',
                style: TextStyle(fontSize: 18, color: Color(0xFF9E9E9E)),
              ),
              const SizedBox(height: 8),
              const Text(
                'Build the app in debug mode to view detection logs',
                style: TextStyle(fontSize: 14, color: Color(0xFF9E9E9E)),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      headers: [
        AppBar(
          title: const Text('Detection Logs'),
          leading: Navigator.of(context).canPop()
              ? [
                  Button(
                    style: const ButtonStyle.ghost(),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Icon(Icons.arrow_back),
                  ),
                ]
              : [],
          trailing: [
            Button(
              style: const ButtonStyle.ghost(),
              onPressed: _loadLogs,
              child: const Icon(Icons.refresh),
            ),
            Button(
              style: const ButtonStyle.ghost(),
              onPressed: _exportLogs,
              child: const Icon(Icons.download),
            ),
            Button(
              style: const ButtonStyle.ghost(),
              onPressed: _clearLogs,
              child: const Icon(Icons.delete_outline),
            ),
          ],
        ),
      ],
      child: Column(
        children: [
          // Search and filter bar
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                // Search field
                TextField(
                  placeholder: const Text('Search logs...'),
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                    _applyFilters();
                  },
                ),
                const SizedBox(height: 12),
                // Filter and sort controls
                Row(
                  children: [
                    Expanded(
                      child: material.PopupMenuButton<CheatType?>(
                        onSelected: (CheatType? value) {
                          setState(() {
                            _selectedFilter = value;
                          });
                          _applyFilters();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: const Color(0xFF404040),
                              width: 1,
                            ),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  _selectedFilter == null
                                      ? 'All types'
                                      : _selectedFilter!.name,
                                  style: const TextStyle(fontSize: 14),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_drop_down, size: 20),
                            ],
                          ),
                        ),
                        itemBuilder: (BuildContext context) => [
                          material.PopupMenuItem<CheatType?>(
                            value: null,
                            child: Row(
                              children: [
                                if (_selectedFilter == null)
                                  const Icon(
                                    Icons.check,
                                    size: 18,
                                    color: Color(0xFF4CAF50),
                                  )
                                else
                                  const SizedBox(width: 18),
                                const SizedBox(width: 8),
                                const Text('All types'),
                              ],
                            ),
                          ),
                          const material.PopupMenuDivider(),
                          ...CheatType.values.map(
                            (CheatType type) =>
                                material.PopupMenuItem<CheatType?>(
                                  value: type,
                                  child: Row(
                                    children: [
                                      if (_selectedFilter == type)
                                        const Icon(
                                          Icons.check,
                                          size: 18,
                                          color: Color(0xFF4CAF50),
                                        )
                                      else
                                        const SizedBox(width: 18),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          type.name,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Showing ${_filteredLogs.length} of ${_allLogs.length} logs',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF9E9E9E),
                      ),
                    ),
                    Button(
                      style: const ButtonStyle.ghost(),
                      onPressed: () {
                        setState(() {
                          _sortNewestFirst = !_sortNewestFirst;
                        });
                        _applyFilters();
                      },
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _sortNewestFirst
                                ? Icons.arrow_downward
                                : Icons.arrow_upward,
                          ),
                          const SizedBox(width: 4),
                          Text(_sortNewestFirst ? 'Newest' : 'Oldest'),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Logs list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredLogs.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.info_outline,
                          size: 64,
                          color: Color(0xFF9E9E9E),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _allLogs.isEmpty
                              ? 'No detections yet'
                              : 'No logs match your filters',
                          style: const TextStyle(
                            fontSize: 18,
                            color: Color(0xFF9E9E9E),
                          ),
                        ),
                        if (_allLogs.isEmpty) ...[
                          const SizedBox(height: 8),
                          const Text(
                            'Logs will appear here when detections occur',
                            style: TextStyle(
                              fontSize: 14,
                              color: Color(0xFF9E9E9E),
                            ),
                            textAlign: TextAlign.center,
                          ),
                          if (kDebugMode && _logsFilePath != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Logs file: $_logsFilePath',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF666666),
                                fontFamily: 'monospace',
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                          const SizedBox(height: 16),
                          OutlineButton(
                            onPressed: _loadLogs,
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.refresh, size: 16),
                                SizedBox(width: 8),
                                Text('Refresh'),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: _filteredLogs.length,
                    itemBuilder: (context, index) {
                      final log = _filteredLogs[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Icon(
                                  _getCheatTypeIcon(log.type),
                                  color: const Color(0xFFF44336),
                                  size: 24,
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        log.type.name,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        log.processName ?? 'Unknown process',
                                        style: const TextStyle(fontSize: 14),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        DateFormat(
                                          'yyyy-MM-dd HH:mm:ss',
                                        ).format(log.timestamp),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Color(0xFF9E9E9E),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Button(
                                  style: const ButtonStyle.ghost(),
                                  onPressed: () {
                                    _showLogDetails(log);
                                  },
                                  child: const Icon(Icons.info_outline),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  IconData _getCheatTypeIcon(CheatType type) {
    switch (type) {
      case CheatType.hostMenu:
      case CheatType.nonHostMenu:
        return Icons.menu;
      case CheatType.overlayMenu:
        return Icons.layers;
      case CheatType.dmaDevice:
        return Icons.usb;
      case CheatType.dllInjection:
        return Icons.extension;
      case CheatType.gameAdapter:
        return Icons.gamepad;
      case CheatType.blacklistedProcess:
        return Icons.block;
      case CheatType.hypervisor:
        return Icons.computer;
      default:
        return Icons.warning;
    }
  }

  void _showLogDetails(DetectionReport log) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Detection: ${log.type.name}'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildDetailRow('Process', log.processName ?? 'Unknown'),
              _buildDetailRow(
                'Time',
                DateFormat('yyyy-MM-dd HH:mm:ss').format(log.timestamp),
              ),
              const SizedBox(height: 12),
              const Text(
                'Evidence:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E1E),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: SelectableText(
                  const JsonEncoder.withIndent('  ').convert(log.evidence),
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                ),
              ),
            ],
          ),
        ),
        actions: [
          PrimaryButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
          ),
          Expanded(
            child: SelectableText(value, style: const TextStyle(fontSize: 14)),
          ),
        ],
      ),
    );
  }
}
