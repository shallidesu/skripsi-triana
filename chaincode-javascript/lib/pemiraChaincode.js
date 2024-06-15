/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class PemiraChaincode extends Contract {

    async InitLedger(ctx) {
        console.info('============= Initialized the Ledger ===========');
    }

    // CreateAsset issues a new asset to the world state with given details.
    async CreatePemilihanObj(ctx, args) {
        try {
            console.info('============= CREATE ASET PEMILIHAN ===========');
            args = JSON.parse(args);

            //define tanggaldibuat dan tanggaldiperbarui
            const timestamp = Date.now();
            const date = new Date(parseInt(timestamp) + 25200000);
            const tanggalDibuat = date.getFullYear() + '-' + ("0" + (date.getMonth() + 1)).slice(-2) + '-' + 
              ("0" + date.getDate()).slice(-2) + ' ' + ("0" + date.getHours()).slice(-2) + ':' + 
              ("0" + date.getMinutes()).slice(-2) + ':' + ("0" + date.getSeconds()).slice(-2) + ' WIB';
            const tanggalDiperbarui = tanggalDibuat;
           
            //create asset object and marshall to JSON
            let pemilihan = {
              docType: 'Pemilihan',
              id: args.idPemilihan,
              judul: args.judul,
              deskripsi: args.deskripsi,
              organisasi: args.organisasi,
              putaran: args.putaran,
              waktu_mulai: args.waktu_mulai,
              waktu_akhir: args.waktu_akhir,
              tanggalDibuat: tanggalDibuat,
              tanggalDiperbarui: tanggalDiperbarui,
              publikasikan: 0,
            }
            console.info(pemilihan);
    
            //save asset to state
            await ctx.stub.putState(args.idPemilihan, Buffer.from(stringify(pemilihan)));
            return JSON.stringify(args.idPemilihan);
        } catch (error){
            return `Error: ${error.message}`;
        }
    }

    // CreatePaslon issues a new asset to the world state with given details.
    async CreatePaslonObj(ctx, args) {
        try {
            console.info('============= CREATE ASET PASLON ===========');
            args = JSON.parse(args);

            //periksa ada tidaknya id pemilihan
            const exists = await this.AssetExists(ctx, args.id_pemilihan);
            if (!exists) {
                throw new Error(`Pemilihan dengan ID ${args.id_pemilihan} ini belum terdaftar`);
            }
    
            // create asset Paslon pada world state
            // ketua dan wakil adalah id mahasiswa
            let paslon = {
                docType: 'Paslon',
                id: args.idPaslon,
                ketua: args.ketua,
                no_urut: args.no_urut,
                visi: args.visi,
                id_pemilihan: args.id_pemilihan
            };
    
            if (args.wakil !== '') {
              paslon.wakil = args.wakil;
            }
    
            if (args.foto_ketua !== '') {
              paslon.foto_ketua = args.foto_ketua;
            }
    
            if (args.foto_wakil !== '') {
              paslon.foto_wakil = args.foto_wakil;
            }
    
            console.info(paslon);
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            await ctx.stub.putState(args.idPaslon, Buffer.from(stringify(paslon)));
            return JSON.stringify(args.idPaslon);
        } catch (error) {
          return error;
        }
    }

    async CreateMisiObj(ctx, args) {
        try {
            console.info('============= CREATE ASET MISI ===========');
            args = JSON.parse(args);

            let misi = args.map(async(item) => {
              const exists = await this.AssetExists(ctx, item.id_paslon);
              if (!exists) {
                throw new Error(`Paslon dengan ID ${item.id_paslon} ini belum terdaftar`);
              }
              
              misi = {
                docType: 'Misi',
                id: item.idMisi,
                id_paslon: item.id_paslon,
                misi: item.misi
              }
              
              console.info(misi);
              await ctx.stub.putState(item.idMisi, Buffer.from(stringify(misi)));
            });

            await Promise.all(misi);
            return { success: true };
        } catch (error){
            return `Error: ${error.message}`;
        }
    }

    async CreatePesertaObj(ctx, args) {
        try{
            console.info('============= CREATE ASET PESERTA ===========');
            args = JSON.parse(args);

            let peserta = args.map(async(item) => {
            const exists = await this.AssetExists(ctx, item.id_pemilihan);
              if (!exists) {
                throw new Error(`Pemilihan dengan ID ${item.id_pemilihan} ini belum terdaftar`);
              }

              peserta = {
                docType: 'Peserta',
                id: item.idPeserta,
                id_pemilihan: item.id_pemilihan,
                id_kelas: item.id_kelas,
                id_mhs:  item.id_mhs,
                waktu_memilih: item.waktu_memilih,
                isOnline: 0,
              }

              console.info(peserta);
              await ctx.stub.putState(item.idPeserta, Buffer.from(stringify(peserta)));
            });

            await Promise.all(peserta);
            return { success: true };
        } catch (error){
            return `Error: ${error.message}`;
        }
    }

    async CreateSuaraObj(ctx, args) {
        try{
            console.info('============= CREATE ASET SUARA ===========');
            args = JSON.parse(args);

            let suara = args.map(async(item) => {
              const exists = await this.AssetExists(ctx, item.id_paslon);
              if (!exists) {
                throw new Error(`Paslon dengan ID ${item.id_paslon} ini belum terdaftar`);
              }

              suara = {
                docType: 'Suara',
                id: item.idSuara,
                id_pemilihan: item.id_pemilihan,
                id_paslon: item.id_paslon,
                id_kelas: item.id_kelas,
                jumlah: 0
              }

              console.info(suara);
              await ctx.stub.putState(item.idSuara, Buffer.from(stringify(suara)));
            });

            await Promise.all(suara);
            return { success: true };
        } catch (error){
            return `Error: ${error.message}`;
        }
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    async UpdatePemilihanById(ctx, args) {
        try {
            args = JSON.parse(args);

            //periksa apakah id pemilihan ini memang ada?
            const exists = await this.AssetExists(ctx, args.id);
            if (!exists) {
                throw new Error(`Pemilihan dengan ID ${args.id} ini belum terdaftar`);
            }
    
            //define tanggaldibuat dan tanggaldiperbarui
            const timestamp = Date.now();
            const date = new Date(parseInt(timestamp) + 25200000);
            const tanggalDiperbarui = date.getFullYear() + '-' + ("0" + (date.getMonth() + 1)).slice(-2) + '-' + ("0" + date.getDate()).slice(-2) + ' ' + ("0" + date.getHours()).slice(-2) + ':' + ("0" + date.getMinutes()).slice(-2) + ':' + ("0" + date.getSeconds()).slice(-2) + ' WIB';
            
            let updatedPemilihan;

            if (args.fcn === "all") {
                console.info('============= UPDATE ASET PEMILIHAN ===========');
                // overwriting original asset with new asset
                updatedPemilihan = {
                  docType: 'Pemilihan',
                  id: args.id, 
                  judul: args.judul, 
                  deskripsi: args.deskripsi, 
                  organisasi: args.organisasi, 
                  putaran: args.putaran,
                  waktu_mulai: args.waktu_mulai,
                  waktu_akhir: args.waktu_akhir,
                  tanggalDibuat: args.tanggalDibuat, 
                  tanggalDiperbarui: tanggalDiperbarui,
                  publikasikan: 0
                }
            } else {
              if (args.fcn === "waktu mulai") {
                console.info('============= UPDATE WAKTU MULAI PEMILIHAN ===========');
                const pemilihan = await this.ReadAsset(ctx, args.id);
                updatedPemilihan = JSON.parse(pemilihan);
                updatedPemilihan.waktu_mulai = args.waktu_mulai;
              } else if (args.fcn === "waktu akhir") {
                console.info('============= UPDATE WAKTU AKHIR PEMILIHAN ===========');
                const pemilihan = await this.ReadAsset(ctx, args.id);
                updatedPemilihan = JSON.parse(pemilihan);
                updatedPemilihan.waktu_akhir = args.waktu_akhir;
              } else if (args.fcn === "publikasikan") {
                console.info('============= UPDATE PUBLIKASIKAN PEMILIHAN ===========');
                const pemilihan = await this.ReadAsset(ctx, args.id);
                updatedPemilihan = JSON.parse(pemilihan);
                updatedPemilihan.publikasikan = args.publikasikan;
              }
            }
            console.info(updatedPemilihan);

            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            return ctx.stub.putState(args.id, Buffer.from(stringify(updatedPemilihan)));
        } catch (error) {
            return `Error: ${error.message}`;
        }
    }
    
    // periksa keunikan judul call dari chaincode
    async ValidasiPemilihanByJudul(ctx, judul) {
        try {
            console.info('============= PERIKSA KEUNIKAN JUDUL PEMILIHAN ===========');
            let queryString = {};
            queryString.selector = {};
            queryString.selector.judul = judul;
          
            // judulExist berupa string
            let judulExist = await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
            if (judulExist){
              console.info(judulExist);
              return judulExist;
            }
        } catch (error){
            return `Error: ${error.message}`;
        }
    } 

    async UpdatePaslonById(ctx, args) {
        try {
            args = JSON.parse(args);

            if (args.fcn === 'total') {
                console.info('============= UPDATE ASET PASLON ===========');

                //periksa apakah id pemilihan ini memang ada?
                const exists = await this.AssetExists(ctx, args.id);
                if (!exists) {
                    throw new Error(`Paslon dengan ID ${args.id} ini belum terdaftar`);
                }

                // overwriting original asset with new asset
                let updatedPaslon = {
                  docType: 'Paslon',
                  id: args.id,
                  ketua: args.ketua,
                  no_urut: args.no_urut,
                  visi: args.visi,
                  id_pemilihan: args.id_pemilihan
                }

                if (args.wakil !== undefined) {
                  updatedPaslon.wakil = args.wakil;
                }

                if (args.foto_ketua !== undefined) {
                  updatedPaslon.foto_ketua = args.foto_ketua;
                }

                if (args.foto_wakil !== undefined) {
                  updatedPaslon.foto_wakil = args.foto_wakil
                }

                console.info(updatedPaslon);
                // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
                await ctx.stub.putState(args.id, Buffer.from(stringify(updatedPaslon)));
            } else {
                console.info('============= UPDATE NOMOR URUT PASLON ===========');
                let updatedPaslon = args.map(async(item) => {
                  const paslon = await this.ReadAsset(ctx, item.id);
                  updatedPaslon = JSON.parse(paslon);
                  updatedPaslon.no_urut = item.no_urut;
          
                  console.log(updatedPaslon);
                  await ctx.stub.putState(item.id, Buffer.from(stringify(updatedPaslon)));
                });
                
                await Promise.all(updatedPaslon);
            }
            
            return { success: true };
        } catch (error){
            return `Error: ${error.message}`;
        }
    }

    async UpdateMisiById(ctx, args) {
        console.info('============= UPDATE ASET MISI ===========');
        args = JSON.parse(args);
        
        // overwriting original asset with new asset
        let updatedMisi = args.map(async(item) => {
          const misi = await this.ReadAsset(ctx, item.id);
          updatedMisi = JSON.parse(misi);
          updatedMisi.misi = item.misi;

          console.log(updatedMisi);
          await ctx.stub.putState(item.id, Buffer.from(stringify(updatedMisi)));
        });

        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
       await Promise.all(updatedMisi);
       return { success: true };
    }
    
    async AllPemilihanPeserta(ctx, args) {
        try {
            console.info('============= QUERY INFORMASI SELURUH PEMILIHAN MILIK PESERTA ===========');
            args = JSON.parse(args);

            let queryString = {};
            queryString.selector = {};
            queryString.selector.docType = 'Peserta';
            queryString.selector.id_mhs = args.id_mhs;
            queryString.selector.id_kelas = args.id_kelas;
    
            let peserta = JSON.parse(await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString))); //cari peserta berdasarkan id kelas dan id mhs
            let pesertaRecord = peserta.map(item => item.Record);
            let pemilihan;
            pemilihan = await Promise.all(pesertaRecord.map(async(item) => {
                const exists = await this.AssetExists(ctx, item.id_pemilihan);
                if (!exists) {
                    return {error: `Pemilihan dengan ID ${item.id_pemilihan} ini belum terdaftar` };
                }
                
                let pemilihanData = JSON.parse(await this.ReadAsset(ctx, item.id_pemilihan));
                pemilihanData.id_kelas = item.id_kelas;
                pemilihanData.id_mhs = item.id_mhs;
                pemilihanData.waktu_memilih = item.waktu_memilih;
                pemilihanData.isOnline = item.isOnline;
    
                console.info(pemilihanData);
                return pemilihanData;
            }));
            
            return pemilihan;
        } catch (error){
            console.log(error);
            return {error: `${error.message}`};
        }
    }

    async GetPemilihanByJudulPutaran(ctx, args) {
        try {
            console.info('============= QUERY INFORMASI PEMILIHAN BY JUDUL DAN PUTARAN ===========');
            args = JSON.parse(args);
            console.info(args);

            let selectorPemilihan = {
              selector: {
                docType: 'Pemilihan',
                judul: args.judul,
                putaran: args.putaran
              }
            }
            let pemilihanObject = JSON.parse(await this.GetQueryResultForQueryString(ctx, JSON.stringify(selectorPemilihan))); //cari pemilihan berdasarkan judul
            let pemilihanRecord = pemilihanObject.map(item => item.Record);
      
            let selectorPeserta = {
                selector: {
                  docType: 'Peserta',
                  id_mhs: args.id_mhs,
                  id_kelas: args.id_kelas
                }
            }
            let pesertaObject = JSON.parse(await this.GetQueryResultForQueryString(ctx, JSON.stringify(selectorPeserta))); //cari pemilihan berdasarkan judul
            let pesertaRecord = pesertaObject.map(item => item.Record);
            
            let pesertaPemilihan;
            await Promise.all(pesertaRecord.map(async(item) => {
                if (item.id_pemilihan === pemilihanRecord[0].id) {
                    const exists = await this.AssetExists(ctx, item.id_pemilihan);
                    if (!exists) {
                        throw new Error(`Peserta tidak terdaftar pada pemilihan dengan ID ${item.id_pemilihan} ini`);
                    }

                    pesertaPemilihan = {
                        id: pemilihanRecord[0].id,
                        judul: pemilihanRecord[0].judul,
                        deskripsi: pemilihanRecord[0].deskripsi,
                        organisasi: pemilihanRecord[0].organisasi,
                        putaran: pemilihanRecord[0].putaran,
                        waktu_mulai: pemilihanRecord[0].waktu_mulai,
                        waktu_akhir: pemilihanRecord[0].waktu_akhir,
                        publikasikan: pemilihanRecord[0].publikasikan,
                        id_mhs: item.id_mhs,
                        id_kelas: item.id_kelas,
                        waktu_memilih: item.waktu_memilih,
                        isOnline: item.isOnline,
                        // txId: item.txId
                    }
                    return pesertaPemilihan;
                }
            }));

            console.info(pesertaPemilihan);
            return pesertaPemilihan; //karena hasilnya cuma 1 pemilihan kan, ga lebih dari 1.
        } catch (error){
            return `Error: ${error.message}`;
        }
    };

    async UpdatePeserta(ctx, args) {
      try {
          console.info('============= UPDATE WAKTU MEMILIH PESERTA ===========');
          args = JSON.parse(args);
          console.info(args);

          const exists = await this.AssetExists(ctx, args.id);
          if (!exists) {
              throw new Error(`Peserta dengan ID ${args.id} ini belum terdaftar`);
          }

          return ctx.stub.putState(args.id, Buffer.from(stringify(args)));
      } catch (error){
          return `Error: ${error.message}`;
      }
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    async SendSuara(ctx, args) {
        try {
            console.info('============= PESERTA MENGIRIM SUARA ===========');
            args = JSON.parse(args);
            console.info(args);

            const exists = await this.AssetExists(ctx, args.id);
            if (!exists) {
                throw new Error(`Suara dengan ID ${args.id} ini belum terdaftar`);
            }
            let sendSuara = JSON.parse(await this.ReadAsset(ctx, args.id));
            sendSuara.jumlah += 1;

            console.info(sendSuara);
            return ctx.stub.putState(args.id, Buffer.from(stringify(sendSuara)));
        } catch (error){
            return `Error: ${error.message}`;
        }
    }

    async CountSuara(ctx, args) {
      try {
          console.info('============= HITUNG SUARA PER PASLON KELAS ===========');
          args = JSON.parse(args);

          let suara = JSON.parse(await this.QueryAssetBySelector(ctx, JSON.stringify(args))); //cari suara berdasarkan idpaslon (suara by idpaslon)
          let suaraRecord = suara.map(item => item.Record); //nanti hasilnya tu ada [{idsuara1},{idsuara2}] yang termasuk ke dalam id paslon tersebut
          
          //dari id suara di dalam suaraRecord, masing-masing dicari history nya
          let suaraMapping = await Promise.all(suaraRecord.map(async(item) => {
            let suaraIterator = await ctx.stub.getHistoryForKey(item.id);
              return this._GetAllResults(suaraIterator, true); //[[{history1 idsuara1},{history2 idsuara1}], [{history1 idsuara2},{history2 idsuara2}]]
          }));
          
          if (args.fcn === 'total'){
              //dari record history suara per id, masing-masing diambil hanya field jumlah untuk histori yang paling baru
              let suaraIterasi = suaraMapping.map(async(item) => {
                  return item[0].Value.jumlah; //diambil yang paling depan karena mau dilihat history terakhir aja
              });  //{jumlah:jumlah1},{jumlah:jumlah2},..

              let result = await Promise.all(suaraIterasi); //ini hasilnya array yang nilainya 'jumlah' dari masing-masing kelas pada id paslon tersebut
              result = result.reduce((acc, curr) => acc + curr, 0);

              console.info(result);
              return (result);
              //result.reduce = dia iterasi setiap elemen dalam array result
              //acc = accumulator = nilai awal = 0 lalu berubah mengikuti nilai acc + curr
              //curr = elemen yang diiterasi saat ini
          } else {
              let suaraIterasi = suaraMapping.map(async(item) => {
                let suaraperkelas = {
                  'id_kelas': item[0].Value.id_kelas,
                  'jumlah': item[0].Value.jumlah
                }
                return suaraperkelas;
              }); //karena suaraRecord tu bentuknya masih [{}, {}, {}] jadi harus diiterasi mapping        

              let result = await Promise.all(suaraIterasi); //ini hasilnya array yang nilainya [ {}, {}]
              
              console.info(result);
              return result;
          }
      } catch (error){
          return `Error: ${error.message}`;
      }
    }

    async DeletePemilihanById(ctx, id) {
      try {
          console.info('============= HAPUS PEMILIHAN BY ID PEMILIHAN ===========');
          const idObj = JSON.parse(id);

          const Pemilihanexists = await this.AssetExists(ctx, idObj.id);
          if (!Pemilihanexists) {
              throw new Error(`ID ${idObj.id} ini belum terdaftar`);
          }
          
          let queryString = {};
          queryString.selector = {};
          queryString.selector.docType = 'Peserta';
          queryString.selector.id_pemilihan = idObj.id;
    
          let peserta = JSON.parse(await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString))); //cari peserta berdasarkan id pemilihan
          let pesertaRecord = peserta.map(item => item.Record);
          await Promise.all(pesertaRecord.map(async(item) => {
              ctx.stub.deleteState(item.id);
          }));

          return ctx.stub.deleteState(idObj.id);
      } catch (error){
          return `Error: ${error.message}`;
      }
    }

    async DeletePaslonById(ctx, id) {
      try {
          console.info('============= HAPUS PASLON BY ID PASLON ===========');
          const idObj = JSON.parse(id);

          const PaslonExists = await this.AssetExists(ctx, idObj.id);
          if (!PaslonExists) {
              throw new Error(`ID ${idObj.id} ini belum terdaftar`);
          }

          let queryString = {};
          queryString.selector = {};
          queryString.selector.docType = 'Suara';
          queryString.selector.id_paslon = idObj.id;
    
          let suara = JSON.parse(await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString))); //cari peserta berdasarkan id pemilihan
          let suaraRecord = suara.map(item => item.Record);
          await Promise.all(suaraRecord.map(async(item) => {
              ctx.stub.deleteState(item.id);
          }));

          return ctx.stub.deleteState(idObj.id);
      } catch (error){
          return `Error: ${error.message}`;
      }
    }

    // DeleteAsset deletes an given asset from the world state.
    async DeleteAssetById(ctx, id) {
        try {
            console.info('============= HAPUS ASET BY ID ASET ===========');
            const idObj = JSON.parse(id);

            const exists = await this.AssetExists(ctx, idObj.id);
            if (!exists) {
                throw new Error(`ID ${idObj.id} ini belum terdaftar`);
            }
            return ctx.stub.deleteState(idObj.id);
        } catch (error){
            return `Error: ${error.message}`;
        }
    }

    //return ada tidaknya asset dari id
    async AssetExists(ctx, id) {
        try {
            const assetJSON = await ctx.stub.getState(id);
            return assetJSON && assetJSON.length > 0;
        } catch (error){
            return `Error: ${error.message}`;
        }
    }

    async QueryAssetBySelector(ctx, args) {
        try {
            console.info('============= QUERY ASET OLEH SELECTOR ===========');
            args = JSON.parse(args);

            let queryString = {};
            queryString.selector = {};
            queryString.selector.docType = args.docType;
            
            if (args.name !== null) {
              if (args.name === "id_pemilihan") {
                queryString.selector.id_pemilihan = args.value;
              } else if (args.name === "id_paslon") {
                queryString.selector.id_paslon = args.value;
              } else if (args.name === "id_mhs") {
                queryString.selector.id_mhs = args.value;
              } else if (args.name === "judul") {
                queryString.selector.judul = args.value;
              } else if (args.name === "id") {
                queryString.selector.id = args.value;
              }
            }
            console.info(queryString);
      
            return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
        } catch (error){
            return `Error: ${error.message}`;
        }
    }

    async ReadAsset(ctx, id) {
        try {
            console.info('============= QUERY ASET OLEH ID ASET ===========');
            const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
            if (!assetJSON || assetJSON.length === 0) {
                throw new Error(`The asset ${id} does not exist`);
            }

            console.info(assetJSON.toString());
            return assetJSON.toString();
        } catch (error){
            return `Error: ${error.message}`;
        }
    }

    // GetAssetHistory returns the chain of custody for an asset since issuance.
    async GetAssetHistory(ctx, args) {
      console.info("============= GET HISTORY UNTUK TRANSAKSI ASSET ===========");
      args = JSON.parse(args);

      let queryString = {};
      queryString.selector = {};
      queryString.selector.docType = args.docType;

      // if (args.docType == 'Suara') {
      //     queryString.selector.id_mhs = args.id_mhs;
      //     queryString.selector.id_kelas = args.id_kelas;
      //     queryString.selector.id_pemilihan = args.id_pemilihan;
      // }

      queryString.selector.id_mhs = args.id_mhs;
      queryString.selector.id_kelas = args.id_kelas;
      queryString.selector.id_pemilihan = args.id_pemilihan;

      let asset = JSON.parse(await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString))); //cari ID suara
      let assetRecord = asset.map(item => item.Record);

      let results = await Promise.all(assetRecord.map(async(item) => {
          let resultsIterator = await ctx.stub.getHistoryForKey(item.id);
          return this._GetAllResults(resultsIterator, true);
      })); // [[{}],[{},{}]]

      console.info(results);
      return JSON.stringify(results);
    }

    // querystring harus dalam bentuk string
    // return dalam bentuk string
    async GetQueryResultForQueryString(ctx, queryString) {
      try {
          let resultsIterator = await ctx.stub.getQueryResult(queryString);
          let results = await this._GetAllResults(resultsIterator, false);
    
          return JSON.stringify(results);
      } catch (error){
          return `Error: ${error.message}`;
      }
    }

    // GetAllAssets returns all assets found in the world state.
    async _GetAllResults(iterator, isHistory) {
      let allResults = [];
      let res = await iterator.next();
      while (!res.done) {
        if (res.value && res.value.value.toString()) {
          let jsonRes = {};
          console.log(res.value.value.toString('utf8'));
          
          if (isHistory && isHistory === true) {
            let seconds = res.value.timestamp.seconds;
            let date = new Date(parseInt(seconds) * 1000 + 25200000);
            jsonRes.TxId = res.value.txId;
            jsonRes.Timestamp = date.getFullYear() + '/' + ("0" + date.getMonth()).slice(-2) + '/' + ("0" + date.getDate()).slice(-2);
            try {
              if (res.isDelete) 
                jsonRes.Value = "ASET SUDAH DIHAPUS!";
              else 
                jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
            } catch (err) {
                console.log(err);
                jsonRes.Value = res.value.value.toString('utf8');
            }
          } else {
            jsonRes.Key = res.value.key;
            try {
              jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
            } catch (err) {
              console.log(err);
              jsonRes.Record = res.value.value.toString('utf8');
            }
          }
          allResults.push(jsonRes);
        }
        res = await iterator.next();
      }
      iterator.close();
      return allResults;
    }
}

module.exports = PemiraChaincode;
