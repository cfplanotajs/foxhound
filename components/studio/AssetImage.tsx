import Image from "next/image";

type AssetImageProps = {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
};

export function AssetImage({ src, alt, className, fill, width, height, sizes }: AssetImageProps) {
  if (!src) return null;
  if (fill) {
    return <Image src={src} alt={alt} fill unoptimized sizes={sizes ?? "100vw"} className={className} />;
  }
  if (!width || !height) return null;
  return <Image src={src} alt={alt} width={width} height={height} unoptimized sizes={sizes} className={className} />;
}
