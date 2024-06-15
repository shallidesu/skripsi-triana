/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const { buildCCPPemilihan, buildWallet } = require('./helper');
const { BlockDecoder } = require('fabric-common');
const { common } = require('@hyperledger/fabric-protos');

const qscc = async (channelName, orgName, email, args, methodName, walletPath) => {
    try {
        const ccp = await buildCCPPemilihan(orgName);
		
        // setup the wallet to hold the credentials of the application user
        const wallet = await buildWallet(Wallets, walletPath);
    
        // Check to see if we've already enrolled the user.\
        const userExists = await wallet.get(email);
        if (!userExists) {
            console.log(`An identity for the user ${email} does not exist in the wallet`);
            console.log('Run the registerUser.js application before retrying');
            return;
        }
        
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet, 
            identity: email, 
            discovery: { enabled: true, asLocalhost: true } 
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork(channelName);
            
        // Get the contract from the network.
        const blockContract = network.getContract("qscc");
        let response = [];
        if (methodName === "GetBlockByNumber") {
            console.log("GetBlockByNumber");
            for (let i = 0; i <= args.number; i++) {
                let result = await blockContract.evaluateTransaction(methodName, channelName, i);
                let decoded = BlockDecoder.decode(result);
                console.log(decoded);
                let header = decoded.header; //ini hasilnya buffer data

                var sha = require('js-sha256');
                var asn = require('asn1.js');
                
                var calculateBlockHash = function(header) {
                    let headerAsn = asn.define('headerAsn', function() {
                        this.seq().obj(
                            this.key('Number').int(),
                            this.key('PreviousHash').octstr(), //ini diubah ke 8-bit string supaya bisa diproses sama asn1.js
                            this.key('DataHash').octstr() //ini diubah ke 8-bit string supaya bisa diproses sama asn1.js
                        );
                    });

                    let output = headerAsn.encode({
                        Number: parseInt(header.number),
                        PreviousHash: header.previous_hash, //buffer
                        DataHash: header.data_hash //buffer
                        }, 'der');
                    let hash = sha.sha256(output);
                    return hash;
                }

                let creator = decoded.data.data[0].payload.header.signature_header.creator.mspid;

                response.push({
                    number: parseInt(header.number),
                    prev_hash: header.previous_hash.toString('hex'), //ini diubah ke string
                    data_hash: calculateBlockHash(header),
                    mspId: creator
                })
            }
        } else if (methodName === "GetChainInfo") {
            console.log("GetChainInfo");
            response = await blockContract.evaluateTransaction(methodName, channelName);
            response = common.BlockchainInfo.deserializeBinary(response);
        }

        gateway.disconnect();
        return response;
    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        return error.message;
    }
}

exports.qscc = qscc;