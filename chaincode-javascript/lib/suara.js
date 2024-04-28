'use strict';

class Suara {
  constructor(idPemilihan, idKelas, suara, waktuMemilih) {
        this.idSuara = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)+'_'+idKelas;
        this.idPemilihan = idPemilihan;
        this.idKelas = idKelas;
        this.suara = suara;
        this.waktuMemilih = waktuMemilih;
        this.type = 'Suara';
    return this;
  }
}

module.exports = Suara;