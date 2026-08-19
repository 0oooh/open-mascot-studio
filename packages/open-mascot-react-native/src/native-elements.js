export const renderNativeScene = (React, primitives, scene, props = {}) => {
  const { Svg, G, Path, Ellipse, Rect } = primitives
  const eyes = scene.eyes.map((eye, index) =>
    React.createElement(
      G,
      {
        key: `eye-${index}`,
        transform: `rotate(${eye.rotation} ${eye.cx} ${eye.cy})`,
      },
      React.createElement(Path, {
        d: eye.path,
        fill: eye.fill,
      }),
    ),
  )

  return React.createElement(
    Svg,
    {
      width: props.width ?? 240,
      height: props.height ?? 240,
      viewBox: scene.viewBox,
      style: props.style,
      accessible: true,
      accessibilityLabel: props.accessibilityLabel ?? 'Animated mascot',
    },
    React.createElement(Rect, {
      x: 0,
      y: 0,
      width: 400,
      height: 400,
      fill: scene.background,
    }),
    React.createElement(Ellipse, scene.shadow),
    React.createElement(
      G,
      { transform: scene.transform },
      React.createElement(Path, { d: scene.blob.path, fill: scene.blob.fill }),
      ...eyes,
    ),
  )
}
