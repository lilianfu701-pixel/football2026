declare module "react-simple-maps" {
  import { ComponentType, SVGProps, MouseEventHandler } from "react";

  export interface ComposableMapProps {
    projectionConfig?: { scale?: number; center?: [number, number] };
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
  export const ComposableMap: ComponentType<ComposableMapProps>;

  export interface GeographiesProps {
    geography: string | object;
    children: (args: { geographies: GeoFeature[] }) => React.ReactNode;
  }
  export const Geographies: ComponentType<GeographiesProps>;

  export interface GeoFeature {
    rsmKey: string;
    id: string | number;
    type: string;
    properties: Record<string, unknown>;
    geometry: object;
  }

  export interface GeoStyle {
    outline?: string;
    cursor?: string;
    opacity?: number;
    fill?: string;
    stroke?: string;
    [key: string]: unknown;
  }
  export interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: GeoFeature;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    onMouseEnter?: MouseEventHandler<SVGPathElement>;
    onMouseLeave?: MouseEventHandler<SVGPathElement>;
    style?: {
      default?: GeoStyle;
      hover?: GeoStyle;
      pressed?: GeoStyle;
    };
  }
  export const Geography: ComponentType<GeographyProps>;

  export interface MarkerProps {
    coordinates: [number, number];
    children?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
  }
  export const Marker: ComponentType<MarkerProps>;
}
