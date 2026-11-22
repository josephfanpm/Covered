import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'

/** The moving dawn sky behind the top band. Loaded lazily; the CSS gradient underneath shows until it is ready. */
export default function DawnShader() {
  return (
    <ShaderGradientCanvas
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      pixelDensity={1}
      fov={40}
      lazyLoad={false}
    >
      <ShaderGradient
        control="props"
        type="plane"
        animate="on"
        uSpeed={0.12}
        uStrength={2.4}
        uDensity={1.2}
        uFrequency={5.5}
        uAmplitude={1}
        color1="#fc8c3a"
        color2="#33a4d6"
        color3="#002447"
        positionX={-1.4}
        positionY={0}
        positionZ={0}
        rotationX={0}
        rotationY={10}
        rotationZ={50}
        cAzimuthAngle={180}
        cPolarAngle={90}
        cDistance={2.2}
        cameraZoom={1}
        lightType="3d"
        brightness={1.1}
        envPreset="city"
        reflection={0.1}
        grain="on"
        grainBlending={0.22}
        enableTransition={false}
      />
    </ShaderGradientCanvas>
  )
}
