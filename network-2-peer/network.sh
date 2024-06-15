#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

ROOTDIR=$(cd "$(dirname "$0")" && pwd)
export PATH=${ROOTDIR}/../bin:${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/configtx
export VERBOSE=false

# push to the required directory & set a trap to go back if needed
pushd ${ROOTDIR} > /dev/null
trap "popd > /dev/null" EXIT

. scripts/utils.sh

: ${CONTAINER_CLI:="docker"}
if command -v ${CONTAINER_CLI}-compose > /dev/null 2>&1; then
    : ${CONTAINER_CLI_COMPOSE:="${CONTAINER_CLI}-compose"}
else
    : ${CONTAINER_CLI_COMPOSE:="${CONTAINER_CLI} compose"}
fi
infoln "Using ${CONTAINER_CLI} and ${CONTAINER_CLI_COMPOSE}"

# Obtain CONTAINER_IDS and remove them
# This function is called when you bring a network down
function clearContainers() {
  infoln "Removing remaining containers"
  ${CONTAINER_CLI} rm -f $(${CONTAINER_CLI} ps -aq --filter label=service=hyperledger-fabric) 2>/dev/null || true
  ${CONTAINER_CLI} rm -f $(${CONTAINER_CLI} ps -aq --filter name='dev-peer*') 2>/dev/null || true
  # ${CONTAINER_CLI} kill "$(${CONTAINER_CLI} ps -q --filter name=ccaas)" 2>/dev/null || true
}

# Delete any images that were generated as a part of this setup
# specifically the following images are often left behind:
# This function is called when you bring the network down
function removeUnwantedImages() {
  infoln "Removing generated chaincode docker images"
  ${CONTAINER_CLI} image rm -f $(${CONTAINER_CLI} images -aq --filter reference='dev-peer*') 2>/dev/null || true
}

# Versions of fabric known not to work with the test network
# NONWORKING_VERSIONS="^1\.0\. ^1\.1\. ^1\.2\. ^1\.3\. ^1\.4\."

# Do some basic sanity checking to make sure that the appropriate versions of fabric
# binaries/images are available. In the future, additional checking for the presence
# of go or other items could be added.
# function checkPrereqs() {
#   ## Check if your have cloned the peer binaries and configuration files.
#   peer version > /dev/null 2>&1

#   if [[ $? -ne 0 || ! -d "./configtx" ]]; then
#     errorln "Peer binary and configuration files not found.."
#     errorln
#     errorln "Follow the instructions in the Fabric docs to install the Fabric Binaries:"
#     errorln "https://hyperledger-fabric.readthedocs.io/en/latest/install.html"
#     exit 1
#   fi
#   # use the fabric tools container to see if the samples and binaries match your
#   # docker images
#   LOCAL_VERSION=$(peer version | sed -ne 's/^ Version: //p')
#   DOCKER_IMAGE_VERSION=$(${CONTAINER_CLI} run --rm hyperledger/fabric-tools:latest peer version | sed -ne 's/^ Version: //p')

#   infoln "LOCAL_VERSION=$LOCAL_VERSION"
#   infoln "DOCKER_IMAGE_VERSION=$DOCKER_IMAGE_VERSION"

#   if [ "$LOCAL_VERSION" != "$DOCKER_IMAGE_VERSION" ]; then
#     warnln "Local fabric binaries and docker images are out of  sync. This may cause problems."
#   fi

#   for UNSUPPORTED_VERSION in $NONWORKING_VERSIONS; do
#     infoln "$LOCAL_VERSION" | grep -q $UNSUPPORTED_VERSION
#     if [ $? -eq 0 ]; then
#       fatalln "Local Fabric binary version of $LOCAL_VERSION does not match the versions supported by the test network."
#     fi

#     infoln "$DOCKER_IMAGE_VERSION" | grep -q $UNSUPPORTED_VERSION
#     if [ $? -eq 0 ]; then
#       fatalln "Fabric Docker image version of $DOCKER_IMAGE_VERSION does not match the versions supported by the test network."
#     fi
#   done

#   ## check for cfssl binaries
#   if [ "$CRYPTO" == "cfssl" ]; then
  
#     cfssl version > /dev/null 2>&1
#     if [[ $? -ne 0 ]]; then
#       errorln "cfssl binary not found.."
#       errorln
#       errorln "Follow the instructions to install the cfssl and cfssljson binaries:"
#       errorln "https://github.com/cloudflare/cfssl#installation"
#       exit 1
#     fi
#   fi

#   ## Check for fabric-ca
#   if [ "$CRYPTO" == "Certificate Authorities" ]; then

#     fabric-ca-client version > /dev/null 2>&1
#     if [[ $? -ne 0 ]]; then
#       errorln "fabric-ca-client binary not found.."
#       errorln
#       errorln "Follow the instructions in the Fabric docs to install the Fabric Binaries:"
#       errorln "https://hyperledger-fabric.readthedocs.io/en/latest/install.html"
#       exit 1
#     fi
#     CA_LOCAL_VERSION=$(fabric-ca-client version | sed -ne 's/ Version: //p')
#     CA_DOCKER_IMAGE_VERSION=$(${CONTAINER_CLI} run --rm hyperledger/fabric-ca:latest fabric-ca-client version | sed -ne 's/ Version: //p' | head -1)
#     infoln "CA_LOCAL_VERSION=$CA_LOCAL_VERSION"
#     infoln "CA_DOCKER_IMAGE_VERSION=$CA_DOCKER_IMAGE_VERSION"

#     if [ "$CA_LOCAL_VERSION" != "$CA_DOCKER_IMAGE_VERSION" ]; then
#       warnln "Local fabric-ca binaries and docker images are out of sync. This may cause problems."
#     fi
#   fi
# }

# Create Organization crypto material using cryptogen or CAs
function createOrgs() {
  if [ -d "organizations/peerOrganizations" ]; then
    rm -Rf organizations/peerOrganizations && rm -Rf organizations/ordererOrganizations
  fi

  # Create crypto material using Fabric CA
  infoln "Generating certificates using Fabric CA"
  ${CONTAINER_CLI_COMPOSE} -f compose/$COMPOSE_FILE_CA -f compose/$CONTAINER_CLI/${CONTAINER_CLI}-$COMPOSE_FILE_CA up -d 2>&1

  . organizations/fabric-ca/registerEnroll.sh

  while :
  do
    if [ ! -f "organizations/fabric-ca/pemilihan/tls-cert.pem" ]; then
      sleep 1
    else
      break
    fi
  done

  infoln "Creating Pemilihan Identities"

  createPemilihan

  infoln "Creating Orderer Org Identities"

  createOrderer

  infoln "Generating CCP files for Pemilihan"
  ./organizations/ccp-generate.sh
}

function networkUp() {
  
  # generate artifacts if they don't exist
  if [ ! -d "organizations/peerOrganizations" ]; then
    createOrgs
  fi

  # ${CONTAINER_CLI_COMPOSE} -f compose/$COMPOSE_FILE_CA -f compose/$CONTAINER_CLI/${CONTAINER_CLI}-$COMPOSE_FILE_CA up -d 2>&1
  
  COMPOSE_FILES="-f compose/${COMPOSE_FILE_BASE} -f compose/${CONTAINER_CLI}/${CONTAINER_CLI}-${COMPOSE_FILE_BASE}"

  COMPOSE_FILES="${COMPOSE_FILES} -f compose/${COMPOSE_FILE_COUCH} -f compose/${CONTAINER_CLI}/${CONTAINER_CLI}-${COMPOSE_FILE_COUCH}"

  DOCKER_SOCK="${DOCKER_SOCK}" ${CONTAINER_CLI_COMPOSE} ${COMPOSE_FILES} up -d 2>&1

  $CONTAINER_CLI ps -a
  if [ $? -ne 0 ]; then
    fatalln "Unable to start network"
  fi
}

# call the script to create the channel, join the peers of orgs
# and then update the anchor peers for each organization
function createChannel() {
  # Bring up the network if it is not already up.
  bringUpNetwork="false"

  if ! $CONTAINER_CLI info > /dev/null 2>&1 ; then
    fatalln "$CONTAINER_CLI network is required to be running to create a channel"
  fi

  # check if all containers are present
  CONTAINERS=($($CONTAINER_CLI ps | grep hyperledger/ | awk '{print $2}'))
  len=$(echo ${#CONTAINERS[@]})

  if [[ $len -ge 4 ]] && [[ ! -d "organizations/peerOrganizations" ]]; then
    echo "Bringing network down to sync certs with containers"
    networkDown
  fi

  [[ $len -lt 4 ]] || [[ ! -d "organizations/peerOrganizations" ]] && bringUpNetwork="true" || echo "Network Running Already"

  if [ $bringUpNetwork == "true"  ]; then
    infoln "Bringing up network"
    networkUp
  fi

  # now run the script that creates a channel. This script uses configtxgen once
  # to create the channel creation transaction and the anchor peer updates.
  scripts/createChannel.sh $CHANNEL_NAME $CLI_DELAY $MAX_RETRY $VERBOSE
}


## Call the script to deploy a chaincode to the channel
function deployCC() {
  ./scripts/deployCC.sh $CHANNEL_NAME $CC_NAME $CC_SRC_PATH $CC_SRC_LANGUAGE $CC_VERSION $CC_SEQUENCE $CC_INIT_FCN $CC_END_POLICY $CC_COLL_CONFIG $CLI_DELAY $MAX_RETRY $VERBOSE

  if [ $? -ne 0 ]; then
    fatalln "Deploying chaincode failed"
  fi
}

## Call the script to deploy a chaincode to the channel
function deployCCAAS() {
  ./scripts/deployCCAAS.sh $CHANNEL_NAME $CC_NAME $CC_SRC_PATH $CCAAS_DOCKER_RUN $CC_VERSION $CC_SEQUENCE $CC_INIT_FCN $CC_END_POLICY $CC_COLL_CONFIG

  if [ $? -ne 0 ]; then
    fatalln "Deploying chaincode-as-a-service failed"
  fi
}

## Call the script to package the chaincode
# function packageChaincode() {

#   infoln "Packaging chaincode"

#   scripts/packageCC.sh $CC_NAME $CC_SRC_PATH $CC_SRC_LANGUAGE $CC_VERSION true

#   if [ $? -ne 0 ]; then
#     fatalln "Packaging the chaincode failed"
#   fi

# }

## Call the script to list installed and committed chaincode on a peer
# function listChaincode() {

#   export FABRIC_CFG_PATH=${PWD}/configtx

#   . scripts/envVar.sh
#   . scripts/ccutils.sh

#   setGlobals $ORG

#   println
#   queryInstalledOnPeer
#   println

#   listAllCommitted

# }

## Call the script to invoke 
# function invokeChaincode() {

#   export FABRIC_CFG_PATH=${PWD}/config

#   . scripts/envVar.sh

#   setGlobals $PEER

#   chaincodeInvoke $ORG $CHANNEL_NAME $CC_NAME $CC_INVOKE_CONSTRUCTOR

# }

# ## Call the script to query chaincode 
# function queryChaincode() {

#   export FABRIC_CFG_PATH=${PWD}/configtx
  
#   . scripts/envVar.sh
#   . scripts/ccutils.sh

#   setGlobals $ORG

#   chaincodeQuery $ORG $CHANNEL_NAME $CC_NAME $CC_QUERY_CONSTRUCTOR

# }


# Tear down running network
function networkDown() {
  local temp_compose=$COMPOSE_FILE_BASE

  COMPOSE_FILE_BASE=compose-network.yaml
  COMPOSE_BASE_FILES="-f compose/${COMPOSE_FILE_BASE} -f compose/${CONTAINER_CLI}/${CONTAINER_CLI}-${COMPOSE_FILE_BASE}"
  COMPOSE_COUCH_FILES="-f compose/${COMPOSE_FILE_COUCH} -f compose/${CONTAINER_CLI}/${CONTAINER_CLI}-${COMPOSE_FILE_COUCH}"
  COMPOSE_CA_FILES="-f compose/${COMPOSE_FILE_CA} -f compose/${CONTAINER_CLI}/${CONTAINER_CLI}-${COMPOSE_FILE_CA}"
  COMPOSE_FILES="${COMPOSE_BASE_FILES} ${COMPOSE_COUCH_FILES} ${COMPOSE_CA_FILES}"

  DOCKER_SOCK=$DOCKER_SOCK ${CONTAINER_CLI_COMPOSE} ${COMPOSE_FILES} down --volumes --remove-orphans
  
  COMPOSE_FILE_BASE=$temp_compose

  # Don't remove the generated artifacts -- note, the ledgers are always removed
  if [ "$MODE" != "restart" ]; then
    # Bring down the network, deleting the volumes
    # ${CONTAINER_CLI} volume rm compose_orderer.pemira.com compose_peer0.pemilihan.pemira.com compose_peer1.pemilihan.pemira.com compose_peer2.pemilihan.pemira.com
    #Cleanup the chaincode containers
    clearContainers
    #Cleanup images
    removeUnwantedImages
    remove orderer block and other channel configuration transactions and certs
    ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf system-genesis-block/*.block organizations/peerOrganizations organizations/ordererOrganizations'
    # remove fabric ca artifacts
    ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf organizations/fabric-ca/pemilihan/msp organizations/fabric-ca/pemilihan/tls-cert.pem organizations/fabric-ca/pemilihan/ca-cert.pem organizations/fabric-ca/pemilihan/IssuerPublicKey organizations/fabric-ca/pemilihan/IssuerRevocationPublicKey organizations/fabric-ca/pemilihan/fabric-ca-server.db'
    ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf organizations/fabric-ca/ordererOrg/msp organizations/fabric-ca/ordererOrg/tls-cert.pem organizations/fabric-ca/ordererOrg/ca-cert.pem organizations/fabric-ca/ordererOrg/IssuerPublicKey organizations/fabric-ca/ordererOrg/IssuerRevocationPublicKey organizations/fabric-ca/ordererOrg/fabric-ca-server.db'
    # ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf addOrg3/fabric-ca/org3/msp addOrg3/fabric-ca/org3/tls-cert.pem addOrg3/fabric-ca/org3/ca-cert.pem addOrg3/fabric-ca/org3/IssuerPublicKey addOrg3/fabric-ca/org3/IssuerRevocationPublicKey addOrg3/fabric-ca/org3/fabric-ca-server.db'
    remove channel and script artifacts
    ${CONTAINER_CLI} run --rm -v "$(pwd):/data" busybox sh -c 'cd /data && rm -rf channel-artifacts log.txt *.tar.gz'
  fi
}

# . ./network.config

# use this as the default docker-compose yaml definition
COMPOSE_FILE_BASE=compose-network.yaml
# docker-compose.yaml file if you are using couchdb
COMPOSE_FILE_COUCH=compose-couch.yaml
# certificate authorities compose file
COMPOSE_FILE_CA=compose-ca.yaml
#

# Get docker sock path from environment variable
SOCK="${DOCKER_HOST:-/var/run/docker.sock}"
DOCKER_SOCK="${SOCK##unix://}"

# Parse commandline args

# Parse mode
if [[ $# -lt 1 ]] ; then
  printHelp
  exit 0
else
  MODE=$1
  shift
fi

## if no parameters are passed, show the help for cc
if [ "$MODE" == "cc" ] && [[ $# -lt 1 ]]; then
  printHelp $MODE
  exit 0
fi

# parse subcommands if used
if [[ $# -ge 1 ]] ; then
  key="$1"
  # check for the createChannel subcommand
  if [[ "$key" == "createChannel" ]]; then
      export MODE="createChannel"
      shift
  # check for the cc command
  elif [[ "$MODE" == "cc" ]]; then
    if [ "$1" != "-h" ]; then
      export SUBCOMMAND=$key
      shift
    fi
  fi
fi


# parse flags

while [[ $# -ge 1 ]] ; do
  key="$1"
  case $key in
  -h )
    printHelp $MODE
    exit 0
    ;;
  -c )
    CHANNEL_NAME="$2"
    shift
    ;;
  -bft )
    BFT=1
    ;;
  -ca )
    CRYPTO="Certificate Authorities"
    ;;
  -cfssl )
    CRYPTO="cfssl"
    ;;
  -r )
    MAX_RETRY="$2"
    shift
    ;;
  -d )
    CLI_DELAY="$2"
    shift
    ;;
  -s )
    DATABASE="$2"
    shift
    ;;
  -ccl )
    CC_SRC_LANGUAGE="$2"
    shift
    ;;
  -ccn )
    CC_NAME="$2"
    shift
    ;;
  -ccv )
    CC_VERSION="$2"
    shift
    ;;
  -ccs )
    CC_SEQUENCE="$2"
    shift
    ;;
  -ccp )
    CC_SRC_PATH="$2"
    shift
    ;;
  -ccep )
    CC_END_POLICY="$2"
    shift
    ;;
  -cccg )
    CC_COLL_CONFIG="$2"
    shift
    ;;
  -cci )
    CC_INIT_FCN="$2"
    shift
    ;;
  -ccaasdocker )
    CCAAS_DOCKER_RUN="$2"
    shift
    ;;
  -org )
    ORG="$2"
    shift
    ;;
  -i )
    IMAGETAG="$2"
    shift
    ;;
  -cai )
    CA_IMAGETAG="$2"
    shift
    ;;
  -ccic )
    CC_INVOKE_CONSTRUCTOR="$2"
    shift
    ;;
  -ccqc )
    CC_QUERY_CONSTRUCTOR="$2"
    shift
    ;;    
  * )
    errorln "Unknown flag: $key"
    printHelp
    exit 1
    ;;
  esac
  shift
done

# Are we generating crypto material with this command?
if [ ! -d "organizations/peerOrganizations" ]; then
  CRYPTO_MODE="with crypto from '${CRYPTO}'"
else
  CRYPTO_MODE=""
fi

# Determine mode of operation and printing out what we asked for
if [ "$MODE" == "up" ]; then
  # infoln "Starting nodes with CLI timeout of '${MAX_RETRY}' tries and CLI delay of '${CLI_DELAY}' seconds and using database '${DATABASE}' ${CRYPTO_MODE}"
  networkUp
elif [ "$MODE" == "createChannel" ]; then
  infoln "Creating channel '${CHANNEL_NAME}'."
  # infoln "If network is not up, starting nodes with CLI timeout of '${MAX_RETRY}' tries and CLI delay of '${CLI_DELAY}' seconds and using database '${DATABASE} ${CRYPTO_MODE}"
  createChannel
elif [ "$MODE" == "down" ]; then
  infoln "Stopping network"
  networkDown
elif [ "$MODE" == "restart" ]; then
  infoln "Restarting network"
  networkDown
  networkUp
elif [ "$MODE" == "deployCC" ]; then
  infoln "deploying chaincode on channel '${CHANNEL_NAME}'"
  deployCC
elif [ "$MODE" == "cc" ] && [ "$SUBCOMMAND" == "package" ]; then
  packageChaincode
# elif [ "$MODE" == "cc" ] && [ "$SUBCOMMAND" == "list" ]; then
#   listChaincode
elif [ "$MODE" == "cc" ] && [ "$SUBCOMMAND" == "invoke" ]; then
  invokeChaincode
elif [ "$MODE" == "cc" ] && [ "$SUBCOMMAND" == "query" ]; then
  queryChaincode
else
  printHelp
  exit 1
fi
