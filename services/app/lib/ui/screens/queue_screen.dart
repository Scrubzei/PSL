import 'package:shadcn_flutter/shadcn_flutter.dart';
import '../../services/matchmaking/queue_service.dart';
import 'package:logger/logger.dart' as logger_pkg;

class QueueScreen extends StatefulWidget {
  const QueueScreen({super.key});

  @override
  State<QueueScreen> createState() => _QueueScreenState();
}

class _QueueScreenState extends State<QueueScreen> {
  final QueueService _queueService = QueueService();
  final logger_pkg.Logger _logger = logger_pkg.Logger();

  bool _isInQueue = false;
  String _statusMessage = 'Ready to join queue';

  Future<void> _joinQueue() async {
    try {
      setState(() {
        _isInQueue = true;
        _statusMessage = 'Joining queue...';
      });

      // TODO: Get actual player ID from config or auth
      const playerId = 'player123';
      await _queueService.joinQueue(playerId);

      setState(() {
        _statusMessage = 'Waiting for match...';
      });

      // Start polling for match status
      _pollQueueStatus();
    } catch (e) {
      _logger.e('Error joining queue: $e');
      setState(() {
        _isInQueue = false;
        _statusMessage = 'Error: $e';
      });
    }
  }

  Future<void> _pollQueueStatus() async {
    while (_isInQueue && mounted) {
      try {
        final status = await _queueService.checkQueueStatus();
        if (status['matched'] == true) {
          setState(() {
            _isInQueue = false;
            _statusMessage = 'Match found!';
          });
          _showMatchFoundDialog(status);
          break;
        }
        await Future.delayed(const Duration(seconds: 2));
      } catch (e) {
        _logger.e('Error checking queue status: $e');
        break;
      }
    }
  }

  void _showMatchFoundDialog(Map<String, dynamic> matchData) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Match Found!'),
        content: Text('Server IP: ${matchData['serverIp']}'),
        actions: [
          PrimaryButton(
            onPressed: () {
              Navigator.of(context).pop();
              // TODO: Launch Plutonium with server IP
            },
            child: const Text('Join Match'),
          ),
        ],
      ),
    );
  }

  Future<void> _leaveQueue() async {
    try {
      await _queueService.leaveQueue();
      setState(() {
        _isInQueue = false;
        _statusMessage = 'Left queue';
      });
    } catch (e) {
      _logger.e('Error leaving queue: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      headers: [
        AppBar(
          title: const Text('Matchmaking Queue'),
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
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  children: [
                    Icon(
                      _isInQueue ? Icons.hourglass_empty : Icons.play_arrow,
                      size: 64,
                      color: _isInQueue
                          ? const Color(0xFFFF9800)
                          : const Color(0xFF4CAF50),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      _statusMessage,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (_isInQueue) ...[
                      const SizedBox(height: 16),
                      const CircularProgressIndicator(),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            PrimaryButton(
              onPressed: _isInQueue ? _leaveQueue : _joinQueue,
              child: Text(_isInQueue ? 'Leave Queue' : 'Join Queue'),
            ),
          ],
        ),
      ),
    );
  }
}
