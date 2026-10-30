/**
 * MASTER DATA UNTUK LANGKAH BAKH (berkas a) DAN SPK (berkas c).
 *
 * Daftar tetap di sini (mudah diedit) — hasil isian form digenerate ke dokumen
 * master `masterpp.docx` (Project Plan / Pengajuan Panjar / BAPP / SPK).
 * Struktur field di `BakhDetail` & `SpkDetail` (src/types/index.ts) dibuat 1 baris
 * per baris isian di dokumen master supaya pemetaan generate tinggal isi.
 *
 * CATATAN: noHp Waspang di bawah masih NOMOR PLACEHOLDER (urut). Ganti dengan
 * nomor asli lewat properti `noHp: '0812…'` pada entri yang bersangkutan.
 */

export interface NamaOrang {
  nama: string;
  jabatan: string;
  /** NIK opsional — tampil sebagai "NAMA / NIK" bila ada. */
  nik?: string;
  /** Nomor HP (khusus Waspang — dipakai field NOHP otomatis). */
  noHp?: string;
}

/** Jumlah orang per team — dipakai hitungan "Jumlah Team FO + Jointer" di BAKH. */
export const ORANG_PER_TEAM_FO = 4;
export const ORANG_PER_TEAM_JOINTER = 2;

/** Nama pekerjaan pilihan pada BAKH. */
export const NAMA_PEKERJAAN_BAKH: string[] = [
  'CENTRATAMA',
  'IFORTE',
  'JLM',
  'MORATEL',
  'MTEL',
  'MYREP',
  'SURGE',
  'TBG',
  'TELIN',
  'UMT XL',
  'HEM',
  'NODE B',
  'OLO',
  'OSP',
  'RELOKASI UTILITAS',
];

/** SELURUH ORANG (satu sumber, difilter per jabatan di bawah). */
export const ORANG_LIST: NamaOrang[] = [
  // --- Admin ---
  { nama: 'INDANA SAKINAH', jabatan: 'Admin' },
  { nama: 'CITRA IRIANI', jabatan: 'Admin' },
  { nama: 'RIZKY WIDIANTO', jabatan: 'Admin' },
  { nama: 'DONI RIYADI', jabatan: 'Admin' },
  { nama: 'RIYAN SEPTIAN', jabatan: 'Admin' },
  { nama: 'ANDIKA SAPUTRA', jabatan: 'Admin' },
  { nama: 'IIS YULISDA', jabatan: 'Admin' },
  { nama: 'ANGGI PRATAMA PUTRA', jabatan: 'Admin' },
  { nama: 'DETO RIO FIRMANSYAH', jabatan: 'Admin' },
  { nama: 'DIMAS HARYANTO', jabatan: 'Admin' },
  { nama: 'MUHAMMAD LUTHFI', jabatan: 'Admin' },
  { nama: 'META MELISA', jabatan: 'Admin' },
  { nama: 'EXSEL VERNALDO', jabatan: 'Admin' },
  { nama: 'MELIAN NUR SEPIYANI', jabatan: 'Admin' },
  { nama: 'DINI SUCI ARIANI', jabatan: 'Admin' },
  { nama: 'HARDI HIDAYAT', jabatan: 'Admin' },
  { nama: 'BASTIAN TOYIB', jabatan: 'Admin' },
  { nama: 'ILHAM HAMDANI UTOMO', jabatan: 'Admin' },
  { nama: 'MOHAMMAD ROZAENI', jabatan: 'Admin' },
  { nama: 'NURBAETY PUSPITASARI DWIYANI', jabatan: 'Admin' },
  { nama: 'TRI SUTOPO', jabatan: 'Admin' },
  { nama: 'IKA ERNA DESIANA', jabatan: 'Admin' },
  { nama: 'DIAH AIRMAYANTI', jabatan: 'Admin' },
  { nama: 'ANDI RIANA', jabatan: 'Admin' },
  { nama: 'YANUAR GUSTIYANA', jabatan: 'Admin' },
  { nama: 'EVA NURLELA MARYAM', jabatan: 'Admin' },
  { nama: 'ROBI ALZAIDAN', jabatan: 'Admin' },
  { nama: 'ROZI ABDUL MUNIR', jabatan: 'Admin' },
  { nama: 'NANDA TAMA HABIBI', jabatan: 'Admin' },
  { nama: 'LAILASARI NURHASANAH', jabatan: 'Admin' },
  { nama: 'SEKAR HARUM RISWIAINI', jabatan: 'Admin' },
  { nama: 'ARINDA KUSUMA WARDANI', jabatan: 'Admin' },
  { nama: 'ARIEF HIDAYAT', jabatan: 'Admin' },
  { nama: 'NISSA ATHIQAH SURI', jabatan: 'Admin' },
  { nama: 'AGAPE JOHANNISAH ROMPAS', jabatan: 'Admin' },
  { nama: 'REVAND ARDIANSYAH', jabatan: 'Admin' },
  { nama: 'GILANG AJI PAMUNGKAS', jabatan: 'Admin' },
  { nama: 'SHINVANI SAGHIRA', jabatan: 'Admin' },
  { nama: 'SURYA ADITYA ANGGA SISWANTO', jabatan: 'Admin' },
  { nama: 'SUCI AFRILIANI SYAHA', jabatan: 'Admin' },

  // --- GM Regional ---
  { nama: 'JOKOWI', jabatan: 'GM Regional Banten' },
  { nama: 'RAHADYAS BHARATA WIDYANDARU, ST., MT', jabatan: 'GM Regional Eastern Jabotabek' },
  { nama: 'ANNISA AYU MONINGGAR', jabatan: 'GM Regional Jabar' },
  { nama: 'YOGA ISTANTO', jabatan: 'GM Regional Jakarta', nik: '720417' },

  // --- Kordinator ---
  { nama: 'JIMANTO', jabatan: 'Kordinator' },

  // --- Mandor ---
  { nama: 'MUHAMMAD MULVISYAH', jabatan: 'Mandor' },
  { nama: 'GALIH NUGRAHA', jabatan: 'Mandor' },
  { nama: 'ADE SISRANDAWI', jabatan: 'Mandor' },
  { nama: 'TATAN CAHYA ALAM', jabatan: 'Mandor' },
  { nama: 'ADIK SUGARA', jabatan: 'Mandor' },
  { nama: 'SYACHRONI', jabatan: 'Mandor' },
  { nama: 'Mahardhiko Ranggayudha', jabatan: 'Mandor' },
  { nama: 'Ridwan', jabatan: 'Mandor' },
  { nama: 'YOPI APRIADI', jabatan: 'Mandor' },
  { nama: 'WIWIL TAUFIK WILDAN', jabatan: 'Mandor' },
  { nama: 'ALDI NURYANA', jabatan: 'Mandor' },
  { nama: 'KABET NEKO SINAMBELA', jabatan: 'Mandor' },
  { nama: 'Muhamad Dimas Ardi Sela', jabatan: 'Mandor' },
  { nama: 'HIDAYATUL MUSTAPID', jabatan: 'Mandor' },
  { nama: 'AGUNG HARTADI', jabatan: 'Mandor' },
  { nama: 'YOGA VISI FAUZI', jabatan: 'Mandor' },
  { nama: 'PENGADILAN LUBIS', jabatan: 'Mandor' },
  { nama: 'LAURENCIA MARSELINE', jabatan: 'Mandor' },
  { nama: 'Fery Febriyatna', jabatan: 'Mandor' },
  { nama: 'ARIF RIZA SETYAWAN', jabatan: 'Mandor' },
  { nama: 'Muhamad Yamin', jabatan: 'Mandor' },
  { nama: 'PUGAS SUBAKTI', jabatan: 'Mandor' },
  { nama: 'BUDI RAHAYU', jabatan: 'Mandor' },
  { nama: 'MOCHAMAD AQSHAL MAULANA', jabatan: 'Mandor' },
  { nama: 'ANDHIKA VICKY SEPTIAN', jabatan: 'Mandor' },

  // --- Project Manager ---
  { nama: 'ARFAN RIYADHI AMARULLAH', jabatan: 'Project Manager' },
  { nama: 'ANGIH WANABAKTI PABISANGAN', jabatan: 'Project Manager' },
  { nama: 'IMAN ERI PRASETYO', jabatan: 'Project Manager' },
  { nama: 'MUHAMMAD ALIY ZULFANNY', jabatan: 'Project Manager' },
  { nama: 'TRI MAHLIL MUSTHOFA', jabatan: 'Project Manager' },
  { nama: 'MUHAMMAD NUR RAHMADI', jabatan: 'Project Manager' },
  { nama: 'UTAMA GYRI WIJAYA', jabatan: 'Project Manager' },
  { nama: 'SIGMA ADI PAMUJI', jabatan: 'Project Manager' },
  { nama: 'ARIGHI ALFISYAHRIN', jabatan: 'Project Manager' },
  { nama: 'MOCHAMAD YAYAN JAELANI', jabatan: 'Project Manager' },
  { nama: 'SUGIRI', jabatan: 'Project Manager' },
  { nama: 'WIWIT SETIANTO', jabatan: 'Project Manager' },
  { nama: 'HADI SUMPAWAN', jabatan: 'Project Manager' },

  // --- Waspang ---
  { nama: 'DADANG KUSNANDAR', jabatan: 'Waspang' },
  { nama: 'RIKI JULIANSAH SAPUTRA', jabatan: 'Waspang' },
  { nama: 'ACHMAD GUSPIOKA FAHMI M', jabatan: 'Waspang' },
  { nama: 'EKA SUDAHYAR', jabatan: 'Waspang' },
  { nama: 'AJI SAPUTRA WIJAYANTO', jabatan: 'Waspang' },
  { nama: 'FEBRIAN CANDRA VALENTINE', jabatan: 'Waspang' },
  { nama: 'FAJAR SUDIYANTO', jabatan: 'Waspang' },
  { nama: 'ANDI PRABOWO', jabatan: 'Waspang' },
  { nama: 'FAJAR JUMNI', jabatan: 'Waspang' },
  { nama: 'ACEP', jabatan: 'Waspang' },
  { nama: 'HERIYANSA', jabatan: 'Waspang' },
  { nama: 'KUNCORO PAMUNGKAS', jabatan: 'Waspang' },
  { nama: 'FAJAR SENJAYA', jabatan: 'Waspang' },
  { nama: 'WAHYUDA FIRMANSYAH', jabatan: 'Waspang' },
  { nama: 'RIANDANI PUTRA', jabatan: 'Waspang' },
  { nama: 'NADZAR ABDILLAH UTAMA', jabatan: 'Waspang' },
  { nama: 'WILLY RAMADHAN SUGANDI', jabatan: 'Waspang' },
  { nama: 'DEDE IRMAN', jabatan: 'Waspang' },
  { nama: 'MUHAMMAD ALFAZAR', jabatan: 'Waspang' },
  { nama: 'RIZKY FIERLANA', jabatan: 'Waspang' },
  { nama: 'AHMAD RIFAI', jabatan: 'Waspang' },
  { nama: 'SUWANDA ASWANDARI', jabatan: 'Waspang' },
  { nama: 'AHSANUL FAJRI', jabatan: 'Waspang' },
  { nama: 'WAHYUDI', jabatan: 'Waspang' },
  { nama: 'MUHAMMAD NENDI', jabatan: 'Waspang' },
  { nama: 'DENDY NOVIANTO', jabatan: 'Waspang' },
  { nama: 'RISWANDI SAPUTRA', jabatan: 'Waspang' },
  { nama: 'ERWIN MEI ALVIAN', jabatan: 'Waspang' },
  { nama: 'R. IRWAN HOGIAWAN', jabatan: 'Waspang' },
  { nama: 'HERIBERTUS BAO LILE BORO', jabatan: 'Waspang' },
  { nama: 'WANDI SANTOSO', jabatan: 'Waspang' },
  { nama: 'ALAN SARENA', jabatan: 'Waspang' },
  { nama: 'ADE ROHMAN', jabatan: 'Waspang' },
  { nama: 'RISMAN HASANUDIN', jabatan: 'Waspang' },
  { nama: 'EDWIN PRAMA YUDA', jabatan: 'Waspang' },
  { nama: 'DIAS ROBINSAR', jabatan: 'Waspang' },
  { nama: 'ARI MUSRIYANTO', jabatan: 'Waspang' },
  { nama: 'JAKARIA', jabatan: 'Waspang' },
  { nama: 'MUHAMAD SOLEH', jabatan: 'Waspang' },
  { nama: 'ABDUL LATIB', jabatan: 'Waspang' },
  { nama: 'ABDULLAH AZZAM MUJAHID. R', jabatan: 'Waspang' },
  { nama: 'DENI ANDRIA', jabatan: 'Waspang' },
  { nama: 'ILHAM ANDRIANSYAH', jabatan: 'Waspang' },
  { nama: 'DHAWY FARRAS', jabatan: 'Waspang' },
  { nama: 'HENDRA YANUAR', jabatan: 'Waspang' },
  { nama: 'RIYADI DWI HARYANTO', jabatan: 'Waspang' },
  { nama: 'MUHAMAD SOFA NAWAWI', jabatan: 'Waspang' },
  { nama: 'MUHAMMAD YASIN', jabatan: 'Waspang' },
  { nama: 'SARIFUDIN', jabatan: 'Waspang' },
  { nama: 'ROBY KURNIA', jabatan: 'Waspang' },
  { nama: 'ATEP IBRAHIM', jabatan: 'Waspang' },
  { nama: 'ADI RAHMAT', jabatan: 'Waspang' },
  { nama: 'ANGGA SAPUTRA', jabatan: 'Waspang' },
  { nama: 'USMAN GUMANTI', jabatan: 'Waspang' },
  { nama: 'MUHAMAD RISZKY ASTRIYA', jabatan: 'Waspang' },
  { nama: 'MAMAN UMARA', jabatan: 'Waspang' },
  { nama: 'CAHYO ADI', jabatan: 'Waspang' },
  { nama: 'ABDURAHMAN', jabatan: 'Waspang' },
  { nama: 'RIYAN RIZKY AMBORO', jabatan: 'Waspang' },
  { nama: 'MAULANA SEPTIADI', jabatan: 'Waspang' },
  { nama: 'CHOIRUL MEGA IRNANDA', jabatan: 'Waspang' },
  { nama: 'HADI PURNAMA', jabatan: 'Waspang' },
  { nama: 'AHMAD HAMDANI', jabatan: 'Waspang' },
  { nama: 'HUSNI RISWANTORO', jabatan: 'Waspang' },
  { nama: 'RAHMAN PAMUNGKAS', jabatan: 'Waspang' },
  { nama: 'AZIZ BUDHI SETIAWAN', jabatan: 'Waspang' },
  { nama: 'ALEX KARMANA', jabatan: 'Waspang' },
  { nama: 'FERDIANSYAH NAUFAL WIDYASTHANA', jabatan: 'Waspang' },
  { nama: 'MUHAMMAD GHUFRAN RABBANI', jabatan: 'Waspang' },
];

export const ADMIN_LIST: NamaOrang[] = ORANG_LIST.filter(o => o.jabatan === 'Admin');
export const GM_LIST: NamaOrang[] = ORANG_LIST.filter(o => o.jabatan.startsWith('GM Regional'));
export const PM_LIST: NamaOrang[] = ORANG_LIST.filter(o => o.jabatan === 'Project Manager');
export const MANDOR_LIST: NamaOrang[] = ORANG_LIST.filter(o => o.jabatan === 'Mandor');
export const KORDINATOR_LIST: NamaOrang[] = ORANG_LIST.filter(o => o.jabatan === 'Kordinator');

/** Waspang + nomor HP. Nomor masih placeholder urut — ganti `noHp` di ORANG_LIST. */
export const WASPANG_LIST: NamaOrang[] = ORANG_LIST.filter(o => o.jabatan === 'Waspang').map(
  (o, i) => ({
    ...o,
    noHp: o.noHp ?? `0812${(90000000 + i * 137).toString().slice(0, 8)}`,
  })
);

/** Teks dropdown pilihan kosong. */
export const PILIHAN_KOSONG = '— Pilih nama —';

export function cariOrang(daftar: NamaOrang[], nama: string): NamaOrang | undefined {
  return daftar.find(o => o.nama === nama);
}

/** Petunjuk singkat di bawah select: jabatan + NIK. */
export function hintOrang(daftar: NamaOrang[], nama: string): string {
  if (!nama) return `Pilih dari daftar master (${daftar.length} nama).`;
  const o = cariOrang(daftar, nama);
  if (!o) return '';
  return o.nik ? `${o.jabatan} · NIK ${o.nik}` : o.jabatan;
}
