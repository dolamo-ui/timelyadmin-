import Image from 'next/image';

/**
 * The Timely logo (public/logo.png). It's decorative by default because it always
 * sits next to the "Timely" name; pass `alt` if it ever stands on its own.
 */
export function Logo({
  size = 32,
  alt = '',
  className,
  priority = false,
}: {
  size?: number;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  return <Image src="/logo.png" alt={alt} width={size} height={size} priority={priority} className={className} />;
}
