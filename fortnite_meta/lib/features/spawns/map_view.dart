import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/spot.dart';
import '../../l10n/app_localizations.dart';
import 'spot_marker.dart';

/// La map, avec les marqueurs positionnés en pourcentage.
///
/// Les coordonnées du contenu sont des pourcentages de l'image, jamais des
/// pixels : la map d'Epic change de résolution d'une saison à l'autre, et un
/// positionnement en pixels serait à refaire à chaque fois.
///
/// La map entière est visible à l'ouverture. Choisir un point de chute, c'est
/// comparer les spots entre eux : en cacher un derrière un bord coûterait plus
/// que les bandes gagnées en remplissant l'écran. Le zoom reste à un pincement.
class MapView extends StatefulWidget {
  const MapView({
    required this.imageUrl,
    required this.spots,
    required this.onSpotTap,
    this.selectedSpotId,
    super.key,
  });

  final String imageUrl;
  final List<Spot> spots;
  final ValueChanged<Spot> onSpotTap;
  final int? selectedSpotId;

  @override
  State<MapView> createState() => _MapViewState();
}

class _MapViewState extends State<MapView> {
  final _transform = TransformationController();

  /// Rapport largeur/hauteur réel de l'image, connu une fois qu'elle est
  /// décodée. On ne le suppose pas carré : rien ne garantit qu'Epic garde ce
  /// format d'une saison à l'autre.
  double? _aspect;

  /// Pilote l'affichage du bouton de recadrage.
  bool _zoomed = false;

  ImageStream? _stream;
  ImageStreamListener? _listener;

  @override
  void initState() {
    super.initState();
    _transform.addListener(_onTransform);
    _resolveAspect();
  }

  @override
  void didUpdateWidget(covariant MapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      _aspect = null;
      _transform.value = Matrix4.identity();
      _resolveAspect();
    }
  }

  void _onTransform() {
    final zoomed = !_isIdentity(_transform.value);
    if (zoomed != _zoomed) setState(() => _zoomed = zoomed);
  }

  static bool _isIdentity(Matrix4 matrix) =>
      (matrix.getMaxScaleOnAxis() - 1).abs() < 0.001;

  void _resolveAspect() {
    _detachStream();
    final provider = CachedNetworkImageProvider(widget.imageUrl);
    final stream = provider.resolve(const ImageConfiguration());
    final listener = ImageStreamListener(
      (info, _) {
        if (!mounted) return;
        setState(() => _aspect = info.image.width / info.image.height);
      },
      // Une image illisible ne doit pas laisser la vue en attente : on garde
      // le rapport par défaut et l'erreur est gérée par le widget d'image.
      onError: (_, _) {},
    );
    stream.addListener(listener);
    _stream = stream;
    _listener = listener;
  }

  void _detachStream() {
    final stream = _stream;
    final listener = _listener;
    if (stream != null && listener != null) stream.removeListener(listener);
    _stream = null;
    _listener = null;
  }

  @override
  void dispose() {
    _detachStream();
    _transform.removeListener(_onTransform);
    _transform.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        // La map est dimensionnée pour tenir entièrement dans la zone, sans
        // transformation initiale : le zoom part donc de 1, et la contre-
        // échelle des marqueurs se lit directement.
        final aspect = _aspect ?? 1;
        var width = constraints.maxWidth;
        var height = width / aspect;
        if (height > constraints.maxHeight) {
          height = constraints.maxHeight;
          width = height * aspect;
        }

        return Stack(
          children: [
            Center(
              child: SizedBox(
                width: width,
                height: height,
                child: InteractiveViewer(
                  transformationController: _transform,
                  minScale: 1,
                  maxScale: 6,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CachedNetworkImage(
                        imageUrl: widget.imageUrl,
                        fit: BoxFit.fill,
                        placeholder: (_, _) => const _MapLoading(),
                        errorWidget: (_, _, _) => const _MapUnavailable(),
                      ),
                      for (final (index, spot) in widget.spots.indexed)
                        Align(
                          // Alignment va de -1 à 1 sur chaque axe, d'où la
                          // conversion depuis un pourcentage de 0 à 100.
                          alignment: Alignment(
                            spot.x / 50 - 1,
                            spot.y / 50 - 1,
                          ),
                          // On lit la transformation en direct : seuls les
                          // marqueurs se reconstruisent pendant un zoom, et
                          // leur taille ne peut pas prendre une frame de retard.
                          child: ListenableBuilder(
                            listenable: _transform,
                            builder: (context, child) => Transform.scale(
                              // Contre-échelle : le marqueur garde sa taille à
                              // l'écran quel que soit le zoom, donc sa cible
                              // tactile aussi.
                              scale: 1 / _transform.value.getMaxScaleOnAxis(),
                              child: child,
                            ),
                            child: SpotMarker(
                              spot: spot,
                              index: index + 1,
                              selected: widget.selectedSpotId == spot.id,
                              onTap: () => widget.onSpotTap(spot),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            if (_zoomed)
              Positioned(
                right: AppSpacing.md,
                bottom: AppSpacing.md,
                child: _ResetZoomButton(
                  label: l10n.spawnsResetZoom,
                  onTap: () => _transform.value = Matrix4.identity(),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _ResetZoomButton extends StatelessWidget {
  const _ResetZoomButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceRaised,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm + 2,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.zoom_out_map_rounded,
                size: 15,
                color: AppColors.accent,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MapLoading extends StatelessWidget {
  const _MapLoading();

  @override
  Widget build(BuildContext context) => const ColoredBox(
    color: AppColors.surface,
    child: Center(
      child: CircularProgressIndicator(
        color: AppColors.accent,
        strokeWidth: 2.5,
      ),
    ),
  );
}

class _MapUnavailable extends StatelessWidget {
  const _MapUnavailable();

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);
    return ColoredBox(
      color: AppColors.surface,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.map_outlined,
              size: 34,
              color: AppColors.unavailable,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              l10n.spawnsMapUnavailable,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
