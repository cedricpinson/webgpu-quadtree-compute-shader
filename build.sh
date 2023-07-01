
rm -rf dist docs/*.js docs/*.map docs/textures
npx parcel build
mkdir -p dist/textures && cp textures/elevation.png textures/earth.jpg dist/textures/
cp -a dist/* docs/
cat docs/index.html | sed 's/.//77' >docs/fixed.html
mv docs/fixed.html docs/index.html
