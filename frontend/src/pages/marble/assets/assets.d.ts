// Vite resolves an image import to its served URL string. The project's tsconfig
// does not pull in "vite/client", so declare just the image types this module uses.
declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}
