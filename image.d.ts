declare module "*.png" {
    const value: any;
    export default value;
}

declare module "*.jpg" {
    const value: any;
    export default value;
}

declare module "*.jpeg" {
    const value: any;
    export default value;
}

declare module "*.gif" {
    const value: any;
    export default value;
}

declare module "*.svg" {
    const value: any;
    export default value;
}
// Same convention as the image declarations above: Metro/Nativewind resolve these
// at bundle time, so TypeScript only needs to know the module exists. Without it
// `import "@/global.css"` in app/(tabs)/home.tsx is a TS2882 under TS 6, which is
// the only thing standing between `npm run typecheck` and a clean run.
declare module "*.css" {
    const value: any;
    export default value;
}
