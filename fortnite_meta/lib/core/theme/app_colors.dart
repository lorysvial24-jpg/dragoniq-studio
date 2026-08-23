import 'package:flutter/material.dart';

/// Palette sombre, orientée jeu compétitif.
///
/// Fond quasi noir légèrement bleuté plutôt que noir pur : sur OLED le noir
/// absolu fait baver les bords des images d'items, qui sont l'élément
/// principal de l'onglet Loadout.
abstract final class AppColors {
  static const background = Color(0xFF0A0D12);
  static const surface = Color(0xFF131820);
  static const surfaceRaised = Color(0xFF1B222D);
  static const border = Color(0xFF26303D);

  static const textPrimary = Color(0xFFE8EDF4);
  static const textSecondary = Color(0xFF93A1B3);
  static const textMuted = Color(0xFF5F6E80);

  /// Vert terminal : cohérent avec une saison « Système Hacké », et assez
  /// saturé pour ressortir sur le fond sans fatiguer.
  static const accent = Color(0xFF00E0A4);
  static const accentDim = Color(0xFF0A7C5E);

  /// Niveaux de contestation. Rouge et vert seuls ne suffisent pas pour un
  /// daltonien : l'UI double toujours la couleur d'un libellé texte.
  static const contestCalm = Color(0xFF3FB950);
  static const contestMedium = Color(0xFFD29922);
  static const contestHot = Color(0xFFF85149);

  /// Utilisé partout où la donnée manque.
  static const unavailable = Color(0xFF4B5768);
}
