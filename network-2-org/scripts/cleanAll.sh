#!bin/bash
. scripts/utils.sh

cd ${PWD}
rm -rf organizations/ordererOrganizations
rm -rf organizations/peerOrganizations
rm -rf organizations/fabric-ca/pemilihan
rm -rf organizations/fabric-ca/hosp2
rm -rf organizations/fabric-ca/ordererOrg
rm -rf channel-artifacts
rm -rf system-genesis-block
rm -rf ../web-app/wallet/*

echo "---- Deleted all identities and blocks files ----"