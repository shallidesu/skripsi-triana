/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const express = require('express')
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
var { expressjwt: expressJwt } = require("express-jwt");
var jwt = require('jsonwebtoken');
const bearerToken = require('express-bearer-token');
const path = require('path');
const fs = require('fs').promises;

const channelName = process.env.CHANNEL_NAME || 'pemirastischannel';
const chaincodeName = process.env.CHAINCODE_NAME || 'pemiraChaincode';

const mspOrg = 'PemilihanMSP';
const walletPath = path.join(__dirname, 'wallet');
const idOrg = 'Pemilihan';

const registerUser = require('./app/registerUser');
const invoke = require('./app/invoke');
const query = require('./app/query');
const qscc = require('./app/qscc');

//secret var set for encoding and decoding jwt to verify token
app.set('secret', 'my-secret-token-key');
//middleware setup
app.use(
    expressJwt ({
        secret: 'my-secret-token-key',
        algorithms: ['HS256'],
    }).unless({
        path: ['/login', '/registerUser']
    })
);
app.use(bearerToken());
app.use(express.urlencoded({ limit: '100mb', extended: true }))
app.use(express.json({ limit: '100mb' }))

app.use((req, res, next) => {
    if (req.originalUrl.indexOf('/login') >= 0 || req.originalUrl.indexOf('/registerUser') >= 0) {
        return next();
    }

    if (req.originalUrl.indexOf('/pemilihan/getjudulputaran/:id') >= 0 || req.originalUrl.indexOf('/paslon/misi/:id') >= 0) {
        var token = req.headers.authorization && req.headers.authorization.split(' ')[1];
        jwt.verify(token, app.get('secret'), (err, decoded) => {
            if (err) {
                res.send({
                    success: false,
                    message: 'Failed to authenticate token. Make sure to include the ' +
                    'token returned from /users call in the authorization header ' +
                    ' as a Bearer token'
                })
                return;
            } else {
                if (decoded.role.full_akses === '1') {
                    req.email = decoded.email;
                    req.password = decoded.password;
                    req.role = decoded.role;
                    return next();
                } else {
                    res.send({
                        success: false,
                        message: 'Access denied! You are not admin here'
                    })
                    return;
                }
                
            }
        })
    } else {
        var token = req.headers.authorization && req.headers.authorization.split(' ')[1];
        jwt.verify(token, app.get('secret'), (err, decoded) => {
            if (err) {
                res.send({
                    success: false,
                    message: 'Failed to authenticate token. Make sure to include the ' +
                    'token returned from /users call in the authorization header ' +
                    ' as a Bearer token'
                })
                return;
            } else {
                req.email = decoded.email;
                req.password = decoded.password;
                req.role = decoded.role;
                return next();
            }
        })
    }
})

//start login
app.post('/login', async(req, res) => {
    const receivedData = req.body;

    let response = await registerUser.isUserRegistered(receivedData, walletPath);
    let register;
    if (response === false) {
        register = await registerUser.registerUser(receivedData, idOrg, mspOrg, walletPath);
        if (register.error === undefined)
            response = true;
    }

    if (response) {
        var token = jwt.sign({
            exp: Math.floor(Date.now() / 1000) + 100000,
            email: receivedData.email,
            password: receivedData.password, //sementara
            role: receivedData.role
        }, app.get('secret'));
    
        console.log(token);
        res.send({success: token});
    } else {
        res.send({error: register.error});
    }
})
//end login

//start registering wallet all users in once -> hanya dijalankan di awal (tidak termasuk dalam batasan penelitian)
app.post('/registerUser', async(res) => {
    try {
        const data = await fs.readFile('./mahasiswa1.csv');
        const csv = await import('neat-csv');
        const parsedData = await csv.default(data);
        const values = parsedData
                    .filter(row => row['email']) //filter row yang kosong
                    .map(row => row['email']); //mapping tiap row nanti hasil dari values adalah ['email','email',...]
        await registerUser.registerManyUsers(values, idOrg, mspOrg, walletPath);
    } catch (error) {
        console.log(error);
    }
})
//end registering wallet all users in once

//start pemilihan
app.get('/pemilihan', async(req,res) => {
    try {
        const methodName = "QueryAssetBySelector";
        const args = {
            docType: "Pemilihan"
        };
        
        const responseString = await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath);
        
        const responseObj = JSON.parse(responseString);
        const recordValues = responseObj.map(item => item.Record);
        console.log(recordValues);
        res.send(recordValues);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
})

app.post('/pemilihan/tambah', async function(req,res) {
    try {
        let pemilihan = req.body;
        const idPemilihan = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '_' + Date.now();;

        pemilihan.idPemilihan = idPemilihan;
        const methodName = "CreatePemilihanObj";
        const pemilihanStringify = JSON.stringify(pemilihan);
        let response;
        if (pemilihan.putaran === '1') {
            const judulExist = await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, pemilihan['judul'], "ValidasiPemilihanByJudul", walletPath);
            if (judulExist === "[]") {
                // process received data
                response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, pemilihanStringify, walletPath);
            } else {
                response = 'Pemilihan dengan judul ini sudah terdaftar!';
           }
        } else {
            response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, pemilihanStringify, walletPath);
        }
        console.log(JSON.stringify(response));
        res.send(response);
    } catch (error) {
        res.send(error);
    }
})

app.post('/pemilihan/tambahpeserta', async function(req,res) {
    try {
        const peserta = req.body;

        // create idpeserta
        peserta.map(item => {
            // create idpeserta
            item.idPeserta = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)  +'_' + item.id_mhs + item.id_kelas;
        })

        const methodName = "CreatePesertaObj";
        // console.log(peserta);

        const pesertaStringify = JSON.stringify(peserta);
        // console.log(pesertaStringify);
        
        const response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, pesertaStringify, walletPath);
        res.send(response);
    } catch (error) {
        res.send(error);
    }
})

//getKelasPesertaByIdPemilihan
app.get('/pemilihan/kelas', async function(req,res) {
    try {
        let args = req.body;
        args.name = "id_pemilihan";
        console.log(args);
        const methodName = "QueryAssetBySelector";
 
        let responseObj = JSON.parse(await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath));
        let response = responseObj.map(item => item.Record);
        console.log(response);
        res.send(response);
    } catch (error) {
        res.send(error);
    }
})

//getPesertaByIdPemilihan
app.get('/pemilihan/peserta', async function (req,res) {
    try {
        const args = req.body;
        const methodName = "GetQueryResultForQueryString";
        console.log(args);

        let queryString = {};
        queryString.selector = {};
        queryString.selector.docType = 'Peserta';
        queryString.selector.id_kelas = args.id_kelas;
        queryString.selector.id_pemilihan = args.id_pemilihan;

        let responseObj = JSON.parse(await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(queryString), methodName, walletPath));
        let response = responseObj.map(item => item.Record);
        console.log(response);
        res.send(response);
    } catch (error) {
        res.send(error)
    }
})

app.get('/pemilihan/edit/:id', async function (req,res) {
    try {
        const methodName = "QueryAssetBySelector";
        let args = {
            docType: "Pemilihan",
            value: req.params.id,
            name: "id"
        }
        console.log(args);

        //ini ambil data dari chaincode
        let responseObj = JSON.parse(await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath));
        let response = responseObj.map(item => item.Record)[0];

        res.send(response);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
})

app.put('/pemilihan/edit/:id', async(req,res) => {
    try {
        const pemilihan = req.body;
        console.log(pemilihan);

        const methodName = "UpdatePemilihanById";
        const pemilihanStringify = JSON.stringify(pemilihan);
        
        let pemilihanByJudul;
        if (pemilihan.cek === 0) {
            delete pemilihan.cek;
            console.log(pemilihanStringify);
            let response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, pemilihanStringify, walletPath);
            console.log(response);
            res.send(JSON.stringify(response));
        } else {
            delete pemilihan.cek;
            pemilihanByJudul = await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, pemilihan['judul'], "ValidasiPemilihanByJudul", walletPath);
            pemilihanByJudul = JSON.parse(pemilihanByJudul);
            // pemilihanRecord = pemilihanByJudul.map(item => item.Record);
            // judul = pemilihanRecord.map(item => item.judul);

            if (Object.keys(pemilihanByJudul).length === 0) {
                // process received data
                console.log(pemilihanStringify);
                let response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, pemilihanStringify, walletPath);
                console.log(JSON.stringify(response));
                res.send(JSON.stringify(response));
            } else {
                res.send('Pemilihan dengan judul ini sudah terdaftar!');
            }
        }
    } catch (error) {
        res.send(error);
    }
})

app.put('/pemilihan/mulai', async(req,res) => {
    try {
        const args = req.body;
        const methodName = "UpdatePemilihanById";
        const argsStringify = JSON.stringify(args);
        console.log(argsStringify);

        const response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, argsStringify, walletPath);
        console.log(response);
        res.send(JSON.stringify(response));
    } catch (error) {
        console.log(error);
        res.send(error);
    }
})

app.put('/pemilihan/akhiri', async(req,res) => {
    try {
        const args = req.body;
        const methodName = "UpdatePemilihanById";
        const argsStringify = JSON.stringify(args);
        console.log(argsStringify);

        const response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, argsStringify, walletPath);
        res.send(JSON.stringify(response));
    } catch (error) {
        console.log(error);
        res.send(error);
    }
})

app.put('/pemilihan/updatepeserta', async(req,res) => {
    try {
        const args = req.body;
        const methodName = "UpdatePeserta";
        const argsStringify = JSON.stringify(args);
        console.log(args);

        const response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, argsStringify, walletPath);
        res.send(JSON.stringify(response));
    } catch (error) {
        res.send(error);
    }
})

app.put('/pemilihan/mulai', async(req,res) => {
    try {
        const args = req.body;
        const methodName = "UpdatePemilihanById";
        const argsStringify = JSON.stringify(args);
        console.log(argsStringify);

        const response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, argsStringify, walletPath);
        console.log(JSON.stringify(response));
        res.send(JSON.stringify(response));
    } catch (error) {
        console.log(error);
        res.send(error);
    }
})

app.delete('/pemilihan/delete', async function (req,res) {
    try {
        const args = req.body;
        console.log('idpemilihan'+JSON.stringify(args));
        const argsStringify = JSON.stringify(args);
        const methodName = "DeletePemilihanById";

        await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, argsStringify, walletPath);
        
        res.status(200).send('Pemilihan berhasil dihapus');
    } catch (error) {
        res.status(500).send('Gagal menghapus pemilihan');
    }
})

app.put('/pemilihan/publikasi', async(req,res) => {
    try {
        const args = req.body;
        const methodName = "UpdatePemilihanById";
        const argsStringify = JSON.stringify(args);
        console.log(argsStringify);

        const response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, argsStringify, walletPath);
        res.send(JSON.stringify(response));
    } catch (error) {
        console.log(error);
        res.send(error);
    }
})

//ini cuma judul pemilihan dari id pemilihan
app.get('/pemilihan/getjudulputaran/:id', async function (req,res) {
    try {
        const methodName = "QueryAssetBySelector";
        let args = {
            docType: "Pemilihan",
            value: req.params.id,
            name: "id"
        }

        //ini ambil data dari chaincode
        let responseObj = JSON.parse(await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath));
        let response = responseObj.map(item => item.Record)[0];
        res.send(response);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
})

//ini gabungan antara pemilihan dengan peserta bersangkutan
app.get('/pemilihan/byjudulputaran', async function (req,res) {
    try {
        let args = req.body;
        console.log(args);
        const methodName = "GetPemilihanByJudulPutaran";
 
        let responseString = await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath);
        let responseObj = JSON.parse(responseString);

        console.log(responseObj);
        res.send(responseObj);
    } catch (error) {
        res.send(error);
    }
})
//end pemilihan


//start paslon
//getAllPaslon
app.get('/paslon/byidpemilihan', async(req,res) => {
    try {
        let args = req.body;
        args.name = "id_pemilihan";
        console.log(args);
        const methodName = "QueryAssetBySelector";

        //ini ambil data dari chaincode
        let responseObj = JSON.parse(await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath));
        let response = responseObj.map(item => item.Record);
        res.send(response);
    } catch (error) {
        res.status(500).send(error);
    }
})

//getPaslonByIdPaslon
app.get('/paslon/:id', async(req,res) => {
    try {
        const methodName = "QueryAssetBySelector";
        let args = {
            docType: "Paslon",
            value: req.params.id,
            name: "id"
        }
        console.log(args);

       //ini ambil data dari chaincode
       let responseObj = JSON.parse(await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath));
       let response = responseObj.map(item => item.Record)[0];
       res.send(response);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
})

app.post('/paslon/tambah', async(req,res) => {
    try {
        let paslon = req.body;

        // //define id paslon
        const idPaslon = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '_' + paslon.id_pemilihan;
        paslon.idPaslon = idPaslon;
        const paslonStringify = JSON.stringify(paslon);
        console.log(paslon);

        const methodName = "CreatePaslonObj";
        let response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, paslonStringify, walletPath);
        res.send(response);
    } catch (error) {
        res.send(error);
    }
})

app.post('/paslon/tambahmisi', async(req,res) => {
    try {
        let misi = req.body; //harusnya dalam bentuk array

        misi.map(item => {
            item.idMisi = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '_' + item.id_paslon;
        });

        const methodName = "CreateMisiObj";
        const misiStringify = JSON.stringify(misi);
        console.log(misi);

        const response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, misiStringify, walletPath);
        res.send(response);
    } catch (error) {
        res.send(error);
    }
})

app.get('/paslon/misi/:id', async(req,res) => {
    try {
        const methodName = "QueryAssetBySelector";
        let args = {
            'docType': 'Misi',
            'name': 'id_paslon',
            'value': req.params.id
        }
        console.log(args);

        //ini ambil data dari chaincode
        let responseObj = JSON.parse(await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath));
        let response = responseObj.map(item => item.Record);
        console.log(response);
        res.send(response);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
})

app.put('/paslon/edit', async(req,res) => {
    try {
        let paslon = req.body;
        paslon.fcn = "total";
        if (paslon.foto_ketua === "") {
            delete paslon.foto_ketua;
        }
        if (paslon.wakil === "") {
            delete paslon.wakil;
        }
        if (paslon.foto_wakil === "") {
            delete paslon.foto_wakil;
        }
        console.log(paslon);
        const methodName = "UpdatePaslonById";
        const paslonStringify = JSON.stringify(paslon);

        let response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, paslonStringify, walletPath);
        res.send(JSON.stringify(response));
    } catch (error) {
        res.send(error);
    }
})

app.put('/paslon/nourut', async function (req,res) {
    try {
        const args = req.body;
        const argsStringify = JSON.stringify(args);
        console.log(args);

        // const methodName = "UpdateNoUrutById";
        const methodName = "UpdatePaslonById";
        response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, argsStringify, walletPath);
        res.send(JSON.stringify(response));
    } catch (error) {
        res.send(error);
    }
})

app.put('/paslon/updatemisi', async(req,res) => {
    try {
        const misi = req.body; //harusnya dalam bentuk array
        const methodName = "UpdateMisiById";
        const misiStringify = JSON.stringify(misi);
        console.log(misi);

        let response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, misiStringify, walletPath);
        res.send(response);
    } catch (error) {
        res.send(error);
    }
})

app.delete('/paslon/delete', async function (req,res) {
    try {
        const args = req.body;
        const argsStringify = JSON.stringify(args);
        const methodName = "DeletePaslonById";

        let response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, argsStringify, walletPath);
        console.log(response);
        res.send(JSON.stringify(response));
    } catch (error) {
        res.send('Gagal menghapus paslon');
    }
})

app.delete('/paslon/deletemisi', async function (req,res) {
    try {
        const args = req.body;
        const argsStringify = JSON.stringify(args);
        const methodName = "DeleteAssetById";

        let response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, argsStringify, walletPath);
        console.log(response);
        res.send(JSON.stringify(response));
    } catch (error) {
        res.send('Gagal menghapus misi');
    }
})

app.post('/paslon/inisialisasisuara', async function(req,res) {
    try {
        let suara = req.body;
        suara.map(item => {
            // create idSuara
            item.idSuara = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '_' + item.id_paslon + '_' + item.id_kelas;
        });

        const methodName = "CreateSuaraObj";
        console.log(suara);
        const suaraStringify = JSON.stringify(suara);
        
        const response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, suaraStringify, walletPath);
        res.send(response);
    } catch (error) {
        res.send(error);
    }
})
//end paslon


//start peserta dan suara
app.get('/allpemilihanpeserta', async function (req,res) {
    try {
        let args = req.body;
        console.log(args);

        const methodName = 'AllPemilihanPeserta';
        let responseString = await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath);
        let responseObj = JSON.parse(responseString);
        console.log(responseObj);
        res.send(responseObj);
    } catch (error) {
        res.send(error);
    }
})

app.get('/peserta/byidkelaspemilihan', async function (req,res) {
    try {
        let args = req.body;
        // const methodName = "GetQueryResultForQueryString";
        const methodName = "GetAssetHistory";
        args.docType='Peserta';

        // let queryString = {};
        // queryString.selector = {};
        // queryString.selector.docType = 'Peserta';
        // queryString.selector.id_mhs = args.id_mhs;
        // queryString.selector.id_kelas = args.id_kelas;
        // queryString.selector.id_pemilihan = args.id_pemilihan;

        // const responseString = await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(queryString), methodName, walletPath);
        let peserta = JSON.parse(await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath)); // [[{}],[{},{}]]
        let response = {};

        for (const item of peserta) {
            for (const element of item) {
                console.log(element.Value);
                if (element.Value === "ASET SUDAH DIHAPUS!") {
                    response.error = "ASET PESERTA INI TELAH DIHAPUS";
                    break;
                } 
                
                if (element.Value.waktu_memilih != null)
                    response.waktu_memilih = element.Value.waktu_memilih;
            } 
        }
        if (response.waktu_memilih != null)
            console.log(response);
        else
            console.log("belum memilih");
        
        res.send(response);
    } catch (error) {
        res.send(error)
    }
})

app.post('/tambahsuara', async function (req,res) {
    try {
        const args = req.body;
        const methodName = "SendSuara";
        const argsStringify = JSON.stringify(args);
        console.log(args);

        const response = await invoke.invokeTransaction(channelName, idOrg, chaincodeName, req.email, methodName, argsStringify, walletPath);
        console.log(response);

        var logout = jwt.sign({
            exp: 1
        }, app.get('secret'));
        res.send(response);
    } catch (error) {
        res.send(error)
    }
})

app.get('/suara/jumlah', async function (req,res) {
    try {
        const args = req.body;
        args.fcn = 'total';
        const methodName = "CountSuara";
        console.log(args);

        const response = await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, JSON.stringify(args), methodName, walletPath);
        console.log(response);
        res.send(response);
    } catch (error) {
        res.send(error)
    }
})

app.get('/suara/jumlahperkelas', async function (req,res) {
    try {
        const args = req.body;
        args.fcn = 'perkelas'
        const methodName = "CountSuara";
        const argsStringify = JSON.stringify(args);
        console.log(args);

        const response = await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, argsStringify, methodName, walletPath);
        console.log(response);
        res.send(response);
    } catch (error) {
        res.send(error)
    }
})

app.get('/suara/gethistory', async function (req,res) {
    try {
        let args = req.body;
        args.docType = 'Suara';
        const methodName = "GetAssetHistory";
        const argsStringify = JSON.stringify(args);
        console.log(args);

        const suara = JSON.parse(await query.queryTransaction(channelName, idOrg, chaincodeName, req.email, argsStringify, methodName, walletPath));
        console.log(suara); // [[{}],[{},{}]]

        let allResponses = [];

        for (const item of suara) {
            // let response = {};
            for (const element of item) {
                let response = {};
                if (element.Value === "ASET SUDAH DIHAPUS!") {
                    response.error = "SUARA TELAH DIHAPUS";
                    break;
                } 
                
                if (element.Value.id_pemilihan == args.id_pemilihan) {
                    if (args.id_kelas == element.Value.id_kelas) { //karena ini kan dari php gaada ditambahain fcn perkelas karena kalo diisi nanti ga beraturan jadi memang harus dipilih dulu kelas berapa
                        response.txId = element.TxId;
                        response.timestamp = element.Timestamp;
                        response.id_pemilihan = element.Value.id_pemilihan;
                        response.id_paslon = element.Value.id_paslon;
                        response.id_kelas = element.Value.id_kelas;
                        response.jumlah = element.Value.jumlah;
                        allResponses.push(response);
                    }
                }
            } 
        }
        console.log(allResponses); //[]
        res.send(allResponses);
    } catch (error) {
        res.send(error)
    }
})

//qscc
app.get('/qscc/GetChainInfo', async(req,res) => {
    try {
        let args = req.body;
        console.log(args);
        
        const methodName = "GetChainInfo";
        let response = await qscc.qscc(channelName, idOrg, req.email, args, methodName, walletPath);
        console.log(response.array);
        res.send(response.array);
    } catch (error) {
        res.send(error);
    }
})

app.get('/qscc/GetBlockByNumber/:number', async(req,res) => {
    try {
        let args = req.params;
        console.log(args);
        
        const methodName = "GetBlockByNumber";
        let result = await qscc.qscc(channelName, idOrg, req.email, args, methodName, walletPath);
        console.log(result);
        res.send(result);
    } catch (error) {
        res.send(error);
    }
})

app.post('/qscc/GetBlockByTxID', async(req,res) => {
    try {
        let args = req.body;
        console.log(args);
        
        const methodName = "GetBlockByTxID";
        let response = await qscc.qscc(channelName, idOrg, req.email, args, methodName, walletPath);
        console.log(response);
        res.send(response);
    } catch (error) {
        res.send(error);
    }
})

//start logout
app.post('/logout', async(req, res) => {
    var logout = jwt.sign({
        exp: 1
    }, app.get('secret'));

    if (logout) {
        res.send({success: 'Success'});
    } else {
        res.send({error: 'Logout tidak berhasil!'});
    }
})
//end logout

http.listen(3000, () => {
    console.log("Server successfully running on port 3000");
});