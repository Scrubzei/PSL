/// Player model for matchmaking
class Player {
  final String id;
  final String username;
  final QueueStatus queueStatus;

  Player({
    required this.id,
    required this.username,
    this.queueStatus = QueueStatus.idle,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'username': username,
    'queueStatus': queueStatus.name,
  };

  factory Player.fromJson(Map<String, dynamic> json) => Player(
    id: json['id'] as String,
    username: json['username'] as String,
    queueStatus: QueueStatus.values.firstWhere(
      (e) => e.name == json['queueStatus'],
      orElse: () => QueueStatus.idle,
    ),
  );
}

/// Player queue status
enum QueueStatus { idle, queued, matched, inGame }
