'use strict';

class Paslon {
  constructor(ketua, wakil, fotoKetua, fotoWakil, noUrut, visi, misi, idPemilihan) {
        this.idPaslon = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)+'_'+idPemilihan;
        this.ketua = ketua;
        this.wakil = wakil;
        this.fotoKetua = fotoKetua;
        this.fotoWakil = fotoWakil;
        this.noUrut = noUrut;
        this.visi = visi;
        this.misi = misi;
        this.type = 'Paslon';
    return this;
  }
}

module.exports = Paslon;