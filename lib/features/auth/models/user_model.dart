class UserModel {
  const UserModel({
    required this.id,
    required this.firstName,
    this.lastName,
    this.email,
    this.college,
  });

  final String id;
  final String firstName;
  final String? lastName;
  final String? email;
  final String? college;

  String get fullName {
    final safeLastName = lastName?.trim();
    if (safeLastName == null || safeLastName.isEmpty) {
      return firstName;
    }
    return '$firstName $safeLastName';
  }

  String get initials {
    final first = firstName.isEmpty ? '' : firstName[0].toUpperCase();
    final safeLastName = lastName?.trim();
    final last = safeLastName == null || safeLastName.isEmpty
        ? ''
        : safeLastName[0].toUpperCase();
    final value = '$first$last';
    return value.isEmpty ? 'U' : value;
  }

  UserModel copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? email,
    String? college,
  }) {
    return UserModel(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      college: college ?? this.college,
    );
  }
}
