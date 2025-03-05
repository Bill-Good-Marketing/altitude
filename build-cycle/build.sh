if (npm run build); then
  exit 0
else
  /app/build-cycle/update-deployment.sh failure "Build failed"
  rm /tmp/deployment
  exit 1
fi