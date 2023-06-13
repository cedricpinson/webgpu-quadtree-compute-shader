
rm -rf dist docs/*.js docs/*.map docs/textures
npx parcel build
mkdir -p dist/textures && cp textures/elevation.png textures/earth.jpg dist/textures/
cp -a dist/* docs/
