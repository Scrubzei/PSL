import 'package:shadcn_flutter/shadcn_flutter.dart';
import '../../core/models/detection_report.dart';

class LogsScreen extends StatefulWidget {
  const LogsScreen({super.key});

  @override
  State<LogsScreen> createState() => _LogsScreenState();
}

class _LogsScreenState extends State<LogsScreen> {
  final List<DetectionReport> _logs = [];

  @override
  Widget build(BuildContext context) {
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
              onPressed: () {
                // TODO: Reload logs
              },
              child: const Icon(Icons.refresh),
            ),
          ],
        ),
      ],
      child: _logs.isEmpty
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
                  const Text(
                    'No detections yet',
                    style: TextStyle(fontSize: 18, color: Color(0xFF9E9E9E)),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _logs.length,
              itemBuilder: (context, index) {
                final log = _logs[index];
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _getCheatTypeIcon(log.type),
                          color: const Color(0xFFF44336),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(log.type.name),
                              Text(
                                '${log.processName ?? "Unknown"} - ${log.timestamp.toString()}',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        Button(
                          style: const ButtonStyle.ghost(),
                          onPressed: () {
                            _showLogDetails(log);
                          },
                          child: const Icon(Icons.info),
                        ),
                      ],
                    ),
                  ),
                );
              },
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
      default:
        return Icons.warning;
    }
  }

  void _showLogDetails(DetectionReport log) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Detection: ${log.type.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Process: ${log.processName ?? "Unknown"}'),
            Text('Time: ${log.timestamp.toString()}'),
            const SizedBox(height: 8),
            const Text(
              'Evidence:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(log.evidence.toString()),
          ],
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
}
