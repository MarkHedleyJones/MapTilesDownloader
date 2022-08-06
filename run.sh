#!/usr/bin/env bash

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)

image_name="map-tiles-downloader"
image_repo="aliashraf"
image_tag="latest"

usage() {
  cat <<EOF
Usage: $(basename "${BASH_SOURCE[0]}") [-h] [-b]

Helper script to run MapTilesDownloader.

Available options:

-h, --help      Print this help and exit
-b, --build     Build the docker image locally (for developmenet)
EOF
  exit
}

parse_params() {
  build=0
  while :; do
    case "${1-}" in
    -h | --help) usage ;;
    -v | --verbose) set -x ;;
    -b | --build) build=1 ;;
    -?*)
      echo "Unknown option: $1"
      exit 1
      ;;
    *) break ;;
    esac
    shift
  done

  args=("$@")

  return 0
}

parse_params "$@"

if [ "${build}" = "1" ]; then
  docker build -t "${image_name}:${image_tag}" "${script_dir}"
else
  # Check for existing container
  if [ "$(docker ps --quiet --all --filter "name=${image_name}")" != "" ]; then
    echo "Container '${image_name}' already exists. Please remove it first. For example:"
    echo ""
    echo "  docker rm -f ${image_name}"
    echo ""
    exit 1
  fi
  if [ "$(docker images -q ${image_name}:latest 2>/dev/null)" != "" ]; then
    # Local development image exists
    echo "Running local/development version, linking src folder into image ..."
    docker run \
      --interactive \
      --tty \
      --name "${image_name}" \
      --rm \
      -v "${script_dir}/src:/app" \
      -v ${PWD}/output:/app/output/ \
      -p 8080:8080 \
      "${image_name}:${image_tag}"
  else
    # Using image from dockerhub
    if [ "$(docker images -q ${image_repo}/${image_name}:latest 2>/dev/null)" == "" ]; then
      echo "Existing Docker image not found, pulling from dockerhub ..."
      docker pull "${image_repo}/${image_name}:${image_tag}"
      echo "Done"
    fi
    echo "Running dockerhub image"
    docker run \
      --interactive \
      --tty \
      --name "${image_name}" \
      --rm \
      -v ${PWD}/output:/app/output/ \
      -p 8080:8080 \
      "${image_repo}/${image_name}:${image_tag}"
  fi
fi
