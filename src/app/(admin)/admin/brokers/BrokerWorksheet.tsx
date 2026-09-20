"use client";

import { useState } from "react";
import { Building2, Check, MapPin, MoreHorizontal, ShieldCheck, UsersRound } from "lucide-react";
import {
  Button,
  ButtonLink,
  FormSection,
  RecordHeader,
  RecordPage,
  StatusBadge,
  UnderlineField,
  UnderlineTextarea,
  type StatusTone,
} from "@/components/admin-ui";
import type { BrokerOrganization, OrganizationStatus } from "@/modules/organizations/types";
import styles from "./worksheet.module.css";

const statusLabel: Record<OrganizationStatus, string> = {
  VERIFIED: "Terverifikasi",
  PENDING: "Perlu verifikasi",
  SUSPENDED: "Ditangguhkan",
  ARCHIVED: "Diarsipkan",
};

const statusTone: Record<OrganizationStatus, StatusTone> = {
  VERIFIED: "success",
  PENDING: "warning",
  SUSPENDED: "danger",
  ARCHIVED: "neutral",
};

const emptyOrganization: BrokerOrganization = {
  id: "new",
  code: "Otomatis setelah disimpan",
  slug: "",
  name: "Broker baru",
  initials: "BR",
  legalName: "",
  type: "BROKERAGE",
  status: "PENDING",
  email: "",
  phone: "",
  whatsapp: "",
  website: "",
  address: "",
  city: "",
  province: "",
  serviceAreas: "",
  description: "",
  principalName: "Belum ditentukan",
  joinedAt: "Belum bergabung",
  memberCount: 0,
  listingCount: 0,
  activeLeadCount: 0,
  branches: [],
};

type BrokerTab = "profile" | "branches" | "team" | "verification";

export default function BrokerWorksheet({ organization = emptyOrganization, mode = "edit" }: { organization?: BrokerOrganization; mode?: "edit" | "create" }) {
  const [tab, setTab] = useState<BrokerTab>("profile");
  const [saved, setSaved] = useState(false);
  const isCreate = mode === "create";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <RecordPage>
      <form onSubmit={handleSubmit}>
        <RecordHeader
          eyebrow={isCreate ? "Registrasi organisasi" : `${organization.code} · ${organization.city}`}
          title={isCreate ? "Broker baru" : organization.name}
          subtitle={isCreate ? "Lengkapi profil organisasi dan principal" : `${organization.legalName} · Principal: ${organization.principalName}`}
          backHref="/admin/brokers"
          status={<StatusBadge tone={statusTone[organization.status]}>{statusLabel[organization.status]}</StatusBadge>}
          actions={
            <div className={styles.desktopActions}>
              {!isCreate && <Button type="button" variant="secondary"><MoreHorizontal size={17} /> Aksi</Button>}
              <Button type="submit"><Check size={17} /> {isCreate ? "Simpan broker" : "Simpan"}</Button>
            </div>
          }
        />

        {!isCreate && (
          <section className={styles.identityStrip}>
            <div className={styles.logo} aria-label={`Logo placeholder ${organization.name}`}>{organization.initials}</div>
            <div><strong>{organization.memberCount}</strong><span>Anggota</span></div>
            <div><strong>{organization.branches.length}</strong><span>Cabang</span></div>
            <div><strong>{organization.listingCount}</strong><span>Listing</span></div>
            <div><strong>{organization.activeLeadCount}</strong><span>Leads aktif</span></div>
          </section>
        )}

        <div className={styles.tabs} role="tablist" aria-label="Bagian profil broker">
          <button type="button" role="tab" aria-selected={tab === "profile"} onClick={() => setTab("profile")}>Profil</button>
          <button type="button" role="tab" aria-selected={tab === "branches"} onClick={() => setTab("branches")}>Cabang</button>
          <button type="button" role="tab" aria-selected={tab === "team"} onClick={() => setTab("team")}>Tim</button>
          <button type="button" role="tab" aria-selected={tab === "verification"} onClick={() => setTab("verification")}>Verifikasi</button>
        </div>

        {tab === "profile" && (
          <>
            <FormSection title="Identitas broker" description="Nama brand dapat berbeda dari nama badan hukum.">
              <div className="ui-form-grid">
                <UnderlineField name="name" label="Nama brand" defaultValue={isCreate ? "" : organization.name} required />
                <UnderlineField name="legalName" label="Nama badan hukum" defaultValue={organization.legalName} />
                <UnderlineField name="code" label="Kode broker" value={organization.code} disabled />
                <UnderlineField name="slug" label="Slug halaman publik" defaultValue={organization.slug} hint="Digunakan pada URL profil broker." />
                <UnderlineTextarea className={styles.full} name="description" label="Deskripsi publik" defaultValue={organization.description} maxLength={600} hint="Jelaskan fokus layanan broker, maksimal 600 karakter." />
              </div>
            </FormSection>

            <FormSection title="Kontak publik" description="Informasi yang dapat tampil pada profil marketplace.">
              <div className="ui-form-grid">
                <UnderlineField name="email" label="Email kantor" type="email" defaultValue={organization.email} />
                <UnderlineField name="phone" label="Telepon kantor" type="tel" defaultValue={organization.phone} />
                <UnderlineField name="whatsapp" label="WhatsApp bisnis" type="tel" defaultValue={organization.whatsapp} />
                <UnderlineField name="website" label="Website" type="url" defaultValue={organization.website} />
              </div>
            </FormSection>

            <FormSection title="Kantor pusat" description="Alamat utama dan cakupan operasional organisasi.">
              <div className="ui-form-grid">
                <UnderlineField name="city" label="Kabupaten / kota" defaultValue={organization.city} />
                <UnderlineField name="province" label="Provinsi" defaultValue={organization.province} />
                <UnderlineField className={styles.full} name="address" label="Alamat kantor" defaultValue={organization.address} />
                <UnderlineField className={styles.full} name="serviceAreas" label="Area layanan" defaultValue={organization.serviceAreas} hint="Nanti menggunakan pilihan wilayah nasional, bukan teks bebas." />
              </div>
            </FormSection>
          </>
        )}

        {tab === "branches" && (
          <FormSection title="Jaringan cabang" description="Setiap cabang mempunyai manager, anggota, dan scope listing sendiri.">
            <div className={styles.sectionActions}><Button type="button" variant="secondary">Tambah cabang</Button></div>
            {organization.branches.length ? (
              <div className={styles.branchList}>
                {organization.branches.map((branch) => (
                  <article className={styles.branchCard} key={branch.id}>
                    <span className={styles.branchIcon}><MapPin size={18} /></span>
                    <div><strong>{branch.name}</strong><small>{branch.city}{branch.isHeadOffice ? " · Kantor pusat" : ""}</small></div>
                    <div className={styles.branchMetric}><strong>{branch.memberCount}</strong><small>anggota</small></div>
                    <div className={styles.branchMetric}><strong>{branch.listingCount}</strong><small>listing</small></div>
                  </article>
                ))}
              </div>
            ) : <div className={styles.empty}><MapPin size={26} /><strong>Belum ada cabang</strong><span>Cabang pertama dapat ditambahkan setelah broker disimpan.</span></div>}
          </FormSection>
        )}

        {tab === "team" && (
          <FormSection title="Ringkasan tim" description="Pengelolaan lengkap user dan role tetap berada pada modul Tim & Akses.">
            <div className={styles.teamSummary}>
              <span className={styles.teamIcon}><UsersRound size={22} /></span>
              <div><strong>{organization.principalName}</strong><span>Principal broker</span></div>
              <div><strong>{organization.memberCount}</strong><span>Total anggota</span></div>
              <ButtonLink href="/admin/users" variant="secondary">Buka Tim & Akses</ButtonLink>
            </div>
          </FormSection>
        )}

        {tab === "verification" && (
          <FormSection title="Verifikasi organisasi" description="Dokumen sensitif hanya terlihat oleh platform operations.">
            <div className={styles.checklist}>
              <span><ShieldCheck size={18} /><span><strong>Identitas principal</strong><small>{organization.status === "VERIFIED" ? "Terverifikasi" : "Menunggu pemeriksaan"}</small></span></span>
              <span><ShieldCheck size={18} /><span><strong>Legalitas organisasi</strong><small>{organization.status === "VERIFIED" ? "Terverifikasi" : "Dokumen belum lengkap"}</small></span></span>
              <span><ShieldCheck size={18} /><span><strong>Kontak bisnis</strong><small>{organization.status === "VERIFIED" ? "Terverifikasi" : "Menunggu konfirmasi"}</small></span></span>
            </div>
          </FormSection>
        )}

        <div className={styles.mobileActions}>
          <ButtonLink href="/admin/brokers" variant="secondary">Batal</ButtonLink>
          <Button type="submit"><Check size={17} /> {isCreate ? "Simpan broker" : "Simpan"}</Button>
        </div>
        {saved && <div className={styles.toast} role="status"><Building2 size={17} /> Prototype tersimpan sementara</div>}
      </form>
    </RecordPage>
  );
}
