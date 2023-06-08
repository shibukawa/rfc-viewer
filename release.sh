set -ex

npm run build
git branch -D pages || true
git switch --orphan pages
mv dist/assets .
mv dist/index.html .
mv dist/vite.svg .
touch .nojekyll
git add assets
git add index.html
git add vite.svg
git add .nojekyll
git commit -m "release"
git push origin pages --force
git switch main
