'use strict';

class Pemilihan {
  constructor(idPemilihan, judul, deskripsi, organisasi, putaran, waktuMulai, waktuAkhir, tanggalDibuat, tanggalDiperbarui) {
        this.idPemilihan = idPemilihan;
        this.judul = judul;
        this.deskripsi = deskripsi;
        this.organisasi = organisasi;
        this.putaran = putaran;
        this.waktuMulai = waktuMulai;
        this.waktuAkhir = waktuAkhir;
        this.tanggalDibuat = tanggalDibuat;
        this.tanggalDiperbarui = tanggalDiperbarui;
        this.publikasikan = 0;
        this.type = 'Pemilihan';
    return this;
  }
}

module.exports = Pemilihan;