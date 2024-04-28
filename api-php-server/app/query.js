/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets, DefaultEventHandlerStrategies } = require('fabric-network');
const { buildCCPPemilihan, buildWallet, prettyJSONString } = require('./helper');

const queryTransaction = async (channelName, orgName, chaincodeName, email, args, methodName, walletPath) => {
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
            discovery: { 
                enabled: true, 
                asLocalhost: true 
            },
            eventHandlerOptions: {
                commitTimeout: 100,
                strategy: DefaultEventHandlerStrategies.MSPID_SCOPE_ROUND_ROBIN
            }
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork(channelName);
            
        // Get the contract from the network.
        const contract = network.getContract(chaincodeName);
    
        let result;
        if (methodName == "QueryAssetBySelector" || methodName == "ValidasiPemilihanByJudul" || methodName == "GetQueryResultForQueryString" || 
            methodName == "AllPemilihanPeserta" || methodName == "GetPemilihanByJudulPutaran" || methodName == "ReadAsset" ||
            methodName == "CountSuara" || methodName == "GetAssetHistory") 
        {

            console.log(methodName);
            result = await contract.evaluateTransaction(methodName, args);
        }

        gateway.disconnect();
        return prettyJSONString(result);
    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        return error.message;
    }
}

exports.queryTransaction = queryTransaction;