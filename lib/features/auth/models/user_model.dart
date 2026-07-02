class UserModel {
  const UserModel({
    required this.uid,
    required this.fullName,
    required this.email,
    this.photoUrl,
    required this.provider,
    required this.createdAt,
    required this.lastLogin,
    this.theme = 'dark',
    this.onboardingCompleted = false,
    this.college = 'LifeOS University',
  });

  final String uid;
  final String fullName;
  final String email;
  final String? photoUrl;
  final String provider;
  final DateTime createdAt;
  final DateTime lastLogin;
  final String theme;
  final bool onboardingCompleted;
  final String? college;

  // Backwards compatibility bindings for older templates
  String get id => uid;
  String get displayName => fullName;

  String get firstName {
    if (fullName.isEmpty) return 'User';
    final parts = fullName.trim().split(RegExp(r'\s+'));
    return parts[0];
  }

  String? get lastName {
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.length < 2) return null;
    return parts.sublist(1).join(' ');
  }

  String get initials {
    if (fullName.isEmpty) return 'U';
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      final first = parts[0].isNotEmpty ? parts[0][0] : '';
      final second = parts[1].isNotEmpty ? parts[1][0] : '';
      return '$first$second'.toUpperCase();
    }
    return fullName[0].toUpperCase();
  }

  UserModel copyWith({
    String? uid,
    String? fullName,
    String? email,
    String? photoUrl,
    String? provider,
    DateTime? createdAt,
    DateTime? lastLogin,
    String? theme,
    bool? onboardingCompleted,
    String? college,
  }) {
    return UserModel(
      uid: uid ?? this.uid,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      photoUrl: photoUrl ?? this.photoUrl,
      provider: provider ?? this.provider,
      createdAt: createdAt ?? this.createdAt,
      lastLogin: lastLogin ?? this.lastLogin,
      theme: theme ?? this.theme,
      onboardingCompleted: onboardingCompleted ?? this.onboardingCompleted,
      college: college ?? this.college,
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      uid: json['uid'] as String? ?? json['id'] as String? ?? '',
      fullName: json['fullName'] as String? ?? json['displayName'] as String? ?? 'LifeOS User',
      email: json['email'] as String? ?? '',
      photoUrl: json['photoUrl'] as String? ?? json['photoURL'] as String?,
      provider: json['provider'] as String? ?? 'password',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      lastLogin: json['lastLogin'] != null
          ? DateTime.parse(json['lastLogin'] as String)
          : DateTime.now(),
      theme: json['theme'] as String? ?? 'dark',
      onboardingCompleted: json['onboardingCompleted'] as bool? ?? false,
      college: json['college'] as String? ?? 'LifeOS University',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'uid': uid,
      'fullName': fullName,
      'email': email,
      'photoUrl': photoUrl,
      'provider': provider,
      'createdAt': createdAt.toIso8601String(),
      'lastLogin': lastLogin.toIso8601String(),
      'theme': theme,
      'onboardingCompleted': onboardingCompleted,
      'college': college,
    };
  }
}
