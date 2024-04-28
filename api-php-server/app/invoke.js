/*
    * SPDX-License-Identifier: Apache-2.0
*/
    
'use strict';
    
const { Gateway, Wallets, DefaultEventHandlerStrategies } = require('fabric-network');
const { buildCCPPemilihan, buildWallet, prettyJSONString } = require('./helper');

const invokeTransaction = async (channelName, orgName, chaincodeName, email, methodName, args, walletPath) => {
    try {
        const ccp = await buildCCPPemilihan(orgName);

        // setup the wallet to hold the credentials of the application user
        const wallet = await buildWallet(Wallets, walletPath);

        // Check to see if we've already enrolled the user.
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
                strategy: DefaultEventHandlerStrategies.NETWORK_SCOPE_ALLFORTX
            }
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork(channelName);
            
        // Get the contract from the network.
        const contract = network.getContract(chaincodeName);
           
        //masukin kontrak ini ke ledger
        let result;
        if (methodName == "CreatePemilihanObj" || methodName == "CreatePesertaObj" || methodName == "CreatePaslonObj" || 
            methodName == "CreateMisiObj" || methodName == "CreateSuaraObj" || methodName == "UpdatePaslonById" || 
            methodName == "UpdateNoUrutById" || methodName == "UpdateMisiById" || methodName == "DeleteAssetById" || 
            methodName == "UpdatePemilihanById" || methodName == "UpdateNoUrutById" || methodName == "SetOnline") 
        {

            console.log(methodName);
            result = await contract.submitTransaction(methodName, args);

        } else if (methodName == "UpdatePeserta") {

            console.log(methodName);
            args = JSON.parse(args);
            args.docType = 'Peserta';
            let peserta = JSON.parse(await contract.evaluateTransaction('GetAssetHistory', JSON.stringify(args)));
            let hasNonNullVal = false; //tidak ada nilai bukan null //bisa memilih
            let updatedPeserta;

            for (const item of peserta) {
                for (const element of item) {
                    updatedPeserta = element.Value;  
                    if (element.Value.waktu_memilih !== null) {
                        //jika ada yang tidak null, maka nilainya jadi true dan tidak bisa memilih
                        hasNonNullVal = true;
                        break;
                    }
                } 
            }
    
            if (hasNonNullVal === false) { //kalau tidak ada nilai bukan null
                updatedPeserta.waktu_memilih = args.waktu_memilih;
                result = await contract.submitTransaction(methodName, JSON.stringify(updatedPeserta));
            }

        } else if (methodName == "SendSuara") {

            console.log(methodName);
            args = JSON.parse(args);
            let queryString = {};
            queryString.selector = {};
            queryString.selector.docType = 'Suara';
            queryString.selector.id_paslon = args.id_paslon;
            queryString.selector.id_kelas = args.id_kelas;
    
            let suara = JSON.parse(await contract.evaluateTransaction("GetQueryResultForQueryString", JSON.stringify(queryString))); //cari suara berdasarkan id kelas dan id paslon
            console.log(suara);
            let sendSuara = suara.map(item => item.Record);
            args.id = sendSuara[0].id;
            result = await contract.submitTransaction(methodName, JSON.stringify(args));

        } else {
            console.log("Tidak ada metode ini pada chaincode")
        }

        gateway.disconnect();
        return prettyJSONString(result);
    } catch (error) {
        console.log(`Failed to submit transaction: ${error}`);
        return error.message;
    }
}

exports.invokeTransaction = invokeTransaction;
    