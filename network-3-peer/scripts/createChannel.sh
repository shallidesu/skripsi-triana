#!/bin/bash

# imports  
. scripts/envVar.sh
. scripts/utils.sh

CHANNEL_NAME="$1"
DELAY="$2"
MAX_RETRY="$3"
VERBOSE="$4"
: ${CHANNEL_NAME:="pemirastischannel"}
: ${DELAY:="3"}
: ${MAX_RETRY:="5"}
: ${VERBOSE:="false"}

: ${CONTAINER_CLI:="docker"}
if command -v ${CONTAINER_CLI}-compose > /dev/null 2>&1; then
    : ${CONTAINER_CLI_COMPOSE:="${CONTAINER_CLI}-compose"}
else
    : ${CONTAINER_CLI_COMPOSE:="${CONTAINER_CLI} compose"}
fi
infoln "Using ${CONTAINER_CLI} and ${CONTAINER_CLI_COMPOSE}"

# create folder channel-artifacts
if [ ! -d "channel-artifacts" ]; then
	mkdir channel-artifacts
fi

#Step one: Generate the genesis block of the channel
createChannelGenesisBlock() {
	which configtxgen
	if [ "$?" -ne 0 ]; then
		fatalln "configtxgen tool not found."
	fi
	
	set -x
	configtxgen -profile ChannelUsingRaft -outputBlock ./channel-artifacts/${CHANNEL_NAME}.block -channelID $CHANNEL_NAME
	res=$?
	{ set +x; } 2>/dev/null

  verifyResult $res "Failed to generate channel configuration transaction..."
}

createChannel() {
  	setGlobals 0
	local rc=1
	local COUNTER=1
	infoln "Adding orderers"
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
		sleep $DELAY
		set -x
		setGlobalsForOrderer
		osnadmin channel join --channelID $CHANNEL_NAME --config-block $BLOCKFILE \
			-o localhost:7053 --ca-file "$ORDERER_CA" --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" \
			--client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY" >&log.txt
		res=$?
		{ set +x; } 2>/dev/null
		let rc=$res
		COUNTER=$(expr $COUNTER + 1)
	done
	cat log.txt
	verifyResult $res "Channel creation failed"
}

# joinChannel ORG
joinChannel() {
	FABRIC_CFG_PATH=$PWD/../config/
	PEER=$1
  	setGlobals $PEER
	echo "pemilihan peer ${PEER}"
		local rc=1
		local COUNTER=1
		## Sometimes Join takes time, hence retry
		while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
			sleep $DELAY
			set -x
			peer channel join -b $BLOCKFILE >&log.txt
			res=$?
			{ set +x; } 2>/dev/null
				let rc=$res
			COUNTER=$(expr $COUNTER + 1)
		done
		cat log.txt
		verifyResult $res "After $MAX_RETRY attempts, peer${PEER}.pemilihan has failed to join channel '$CHANNEL_NAME' "
}

setAnchorPeer() {
  ${CONTAINER_CLI} exec cli ./scripts/setAnchorPeer.sh $CHANNEL_NAME 
}


# updateAnchorPeer() {
# 	setGlobals 0
# 	local rc=1
# 	local COUNTER=1
# 	## Sometimes Join takes time, hence retry
# 	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
#     sleep $DELAY
#     set -x
# 		peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer.pemira.com -c $CHANNEL_NAME -f ${CORE_PEER_LOCALMSPID}anchors.tx --tls --cafile $ORDERER_CA >&log.txt
#     res=$?
#     { set +x; } 2>/dev/null
# 		let rc=$res
# 		COUNTER=$(expr $COUNTER + 1)
# 	done
# 	cat log.txt
# 	verifyResult $res "Anchor peer update failed"
# 	echo "Anchor peers updated for org '$CORE_PEER_LOCALMSPID' on channel '$CHANNEL_NAME'"
# }

FABRIC_CFG_PATH=${PWD}/configtx

## Create channel genesis block
infoln "Generating channel genesis block '${CHANNEL_NAME}.block'"
createChannelGenesisBlock

FABRIC_CFG_PATH=$PWD/../config/
BLOCKFILE="./channel-artifacts/${CHANNEL_NAME}.block"

## Create channel
infoln "Creating channel ${CHANNEL_NAME}"
createChannel
successln "Channel '$CHANNEL_NAME' created"

## Join all the peers to the channel
infoln "Joining pemilihan peer0 to the channel..."
joinChannel 0
infoln "Joining pemilihan peer1 to the channel..."
joinChannel 1
infoln "Joining pemilihan peer2 to the channel..."
joinChannel 2

## Set the anchor peers for each org in the channel
infoln "Setting anchor peer for pemilihan..."
setAnchorPeer

successln "Channel '$CHANNEL_NAME' joined"
