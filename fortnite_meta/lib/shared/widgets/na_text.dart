import 'package:flutter/material.dart';

import '../../core/localized_text.dart';
import '../../core/theme/app_colors.dart';
import '../../l10n/app_localizations.dart';

/// Affiche un texte éditorial, ou « N/A » s'il n'est pas renseigné.
///
/// Le point de passage unique de la règle « ne devine jamais une donnée ».
/// Le N/A est volontairement grisé et en italique : il doit se lire comme une
/// absence assumée, pas comme du contenu.
class NaText extends StatelessWidget {
  const NaText(
    this.text, {
    required this.fallbackCode,
    this.style,
    this.maxLines,
    super.key,
  });

  final LocalizedText text;
  final String fallbackCode;
  final TextStyle? style;
  final int? maxLines;

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);
    final languageCode = Localizations.localeOf(context).languageCode;
    final resolved = text.resolve(languageCode, fallbackCode: fallbackCode);

    if (resolved == null) {
      return Text(
        l10n.notAvailable,
        style: (style ?? const TextStyle()).copyWith(
          color: AppColors.unavailable,
          fontStyle: FontStyle.italic,
        ),
        maxLines: maxLines,
        overflow: maxLines == null ? null : TextOverflow.ellipsis,
      );
    }

    return Text(
      resolved,
      style: style,
      maxLines: maxLines,
      overflow: maxLines == null ? null : TextOverflow.ellipsis,
    );
  }
}
