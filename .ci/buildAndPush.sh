PACKAGE_VERSION=$(jq .version -r package.json)

docker build \
    --tag ghcr.io/nmshd/connector:$BUILD_NUMBER \
    --tag ghcr.io/nmshd/connector:$COMMIT_HASH \
    --tag ghcr.io/nmshd/connector:latest \
    --tag ghcr.io/nmshd/connector:$PACKAGE_VERSION \
    --build-arg COMMIT_HASH=$COMMIT_HASH \
    --build-arg BUILD_NUMBER=$BUILD_NUMBER .

docker push ghcr.io/nmshd/connector:$BUILD_NUMBER
docker push ghcr.io/nmshd/connector:$COMMIT_HASH

OUTPUT=$(DOCKER_CLI_EXPERIMENTAL=enabled docker manifest inspect ghcr.io/nmshd/connector:${PACKAGE_VERSION} 2>&1)
if [[ $OUTPUT =~ (no such manifest: ghcr.io/nmshd/connector:) ]]; then # manifest not found -> push
    docker push ghcr.io/nmshd/connector:latest

    docker push ghcr.io/nmshd/connector:$PACKAGE_VERSION
elif [[ $OUTPUT =~ (\{) ]]; then # manifest found -> ignore
    echo "image '$PACKAGE_VERSION' already exists"
else # other error
    echo $OUTPUT
fi
