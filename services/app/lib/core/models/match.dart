import 'player.dart';

/// Match model for 1v1 matches
class Match {
  final Player player1;
  final Player player2;
  final String serverIp;
  final int? player1Score;
  final int? player2Score;

  Match({
    required this.player1,
    required this.player2,
    required this.serverIp,
    this.player1Score,
    this.player2Score,
  });

  Map<String, dynamic> toJson() => {
    'player1': player1.toJson(),
    'player2': player2.toJson(),
    'serverIp': serverIp,
    'player1Score': player1Score,
    'player2Score': player2Score,
  };

  factory Match.fromJson(Map<String, dynamic> json) => Match(
    player1: Player.fromJson(json['player1'] as Map<String, dynamic>),
    player2: Player.fromJson(json['player2'] as Map<String, dynamic>),
    serverIp: json['serverIp'] as String,
    player1Score: json['player1Score'] as int?,
    player2Score: json['player2Score'] as int?,
  );

  bool get isCompleted => player1Score != null && player2Score != null;
}
