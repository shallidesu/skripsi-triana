#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

rm -rf organizations/ordererOrganizations
rm -rf organizations/peerOrganizations
# cd ./organizations/fabric-ca/pemilihan
# rm -v !("fabric-ca-server-config.yaml")
# cd ../ordererOrg
# rm -v !("fabric-ca-server-config.yaml")

# cd ../../..

rm -rf ../api-php-server/wallet
./network.sh down
