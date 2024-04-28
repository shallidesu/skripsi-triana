/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const adminUserId = 'admin';

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const helper = require('./helper');

const registerUser = async (args, orgName, orgMspId, walletPath) => {
	try {
        const ccp = await helper.buildCCPPemilihan(orgName);
        
        // build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = await helper.buildCAClient(FabricCAServices, ccp, 'ca.pemilihan.pemira.com');
		// const caClient = await helper.buildCAClient(FabricCAServices, ccp, 'ca.org1.pemira.com');

        // setup the wallet to hold the credentials of the application user
        const wallet = await helper.buildWallet(Wallets, walletPath);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.get(args.email);
        if (userExists) {
            var response = {
                success: false,
                message: `An identity for the user ${args.email} already exists in the wallet`,
            };
            return response;
        }
        
        // Check to see if we've already enrolled the admin user.
        let adminIdentity = await wallet.get(adminUserId);
        if (!adminIdentity) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            console.log('================Running enrollAdmin================');
            await helper.enrollAdmin(caClient, wallet, orgMspId);
            adminIdentity = await wallet.get(adminUserId);
            console.log("Admin enrolled successfully");
        }
        
        // build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);
        
        // Register the user, enroll the user, and import the new identity into the wallet.
        let secret;
        try {
            secret = await caClient.register({enrollmentID: args.email, role: 'client'}, adminUser);
        } catch (error) {
            return error.message;
        }
            
        const enrollment = await caClient.enroll({ enrollmentID: args.email, enrollmentSecret: secret });
        
        const x509Identity = {
            credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
            mspId: orgMspId,
            type: 'X.509',
        };

        await wallet.put(args.email, x509Identity);
        console.log('Successfully registered, enrolled user '+args.email+', and imported it into the wallet');
        var response = {
            success: args.email + ' enrolled Successfully',
        };
        return response
    } catch (error) {
        var response = {
            error: `Failed to register user `+args.email+ `. Error: `+error
        };
        console.log(`Failed to register user `+args.email+`: ${error}`);
        return response;
    }
}

const registerManyUsers = async (args,orgName, orgMspId, walletPath) => {
    try {
        const ccp = await helper.buildCCPPemilihan(orgName);
        
        // build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = await helper.buildCAClient(FabricCAServices, ccp, 'ca.pemilihan.pemira.com');
		// const caClient = await helper.buildCAClient(FabricCAServices, ccp, 'ca.org1.pemira.com');

        // setup the wallet to hold the credentials of the application user
        const wallet = await helper.buildWallet(Wallets, walletPath);

        // Check to see if we've already enrolled the admin user.
        let adminIdentity = await wallet.get(adminUserId);
        if (!adminIdentity) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            console.log('================Running enrollAdmin================');
            await helper.enrollAdmin(caClient, wallet, orgMspId);
            adminIdentity = await wallet.get(adminUserId);
            console.log("Admin enrolled successfully");
        }
        
        // build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

        console.log('================Registering users of client application================');
        for (let user of args) {
            console.log('================Registering user ' + user + '================');
            // Check to see if we've already enrolled the user.
            const userExists = await wallet.get(user);
            if (userExists) {
                var response = {
                    success: false,
                    message: `An identity for the user ${user} already exists in the wallet`,
                };
                // return response;
            }
            
            // Register the user, enroll the user, and import the new identity into the wallet.
            let secret;
            try {
                secret = await caClient.register({
                    enrollmentID: user,
                    role: 'client',
                }, adminUser);
            } catch (error) {
                return error.message;
            }
                
            const enrollment = await caClient.enroll({ 
                enrollmentID: user, 
                enrollmentSecret: secret 
            });
            
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: orgMspId,
                type: 'X.509',
            };

            await wallet.put(user, x509Identity);
            console.log('Successfully registered, enrolled user '+user+', and imported it into the wallet');
            var response = {
                success: user + ' enrolled Successfully',
            };
        }
        return response
    } catch (error) {
        var response = {
            error: `Failed to register user `+args.email+ `. Error: `+error
        };
        console.log(`Failed to register many users: ${error}`);
        return response;
    }
}

const isUserRegistered = async (args, walletPath) => {
    // setup the wallet to hold the credentials of the application user
    const wallet = await helper.buildWallet(Wallets, walletPath);
    
    const userExists = await wallet.get(args.email);
    if (userExists) {
        console.log(`An identity for the user ${args.email} already exists in the wallet`);
        return true;
    }
    return false;
}

module.exports = {
    registerUser: registerUser,
    isUserRegistered: isUserRegistered,
    registerManyUsers: registerManyUsers
}