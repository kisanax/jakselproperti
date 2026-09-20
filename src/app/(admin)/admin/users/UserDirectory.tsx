"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Plus, Search, UsersRound } from "lucide-react";
import { ButtonLink, RecordHeader, RecordPage, StatusBadge, type StatusTone } from "@/components/admin-ui";
import { roleLabel } from "@/lib/permissions";
import { accountStatus, type AccountUser, type UserAccountStatus } from "@/modules/users/types";
import styles from "./users.module.css";

const statusTone: Record<UserAccountStatus, StatusTone> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  DELETED: "neutral",
};

const statusLabel: Record<UserAccountStatus, string> = {
  ACTIVE: "Aktif",
  SUSPENDED: "Nonaktif",
  DELETED: "Terhapus",
};

const verificationLabel: Record<string, string> = {
  PROFILE_INCOMPLETE: "Profil belum lengkap",
  PENDING_REVIEW: "Menunggu review",
  REVISION_REQUIRED: "Perlu revisi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  SUSPENDED: "Ditangguhkan",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function UserDirectory({ users }: { users: AccountUser[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [role, setRole] = useState("ALL");

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("id-ID");
    return users.filter((user) => {
      const matchesQuery =
        !normalized ||
        [user.name, user.email].some((value) => value?.toLocaleLowerCase("id-ID").includes(normalized));
      const userStatus = accountStatus(user);
      return (
        matchesQuery &&
        (status === "ALL" || userStatus === status) &&
        (role === "ALL" || user.platformRole === role)
      );
    });
  }, [query, role, status, users]);

  return (
    <RecordPage>
      <RecordHeader
        eyebrow="Broker workspace"
        title="Tim & Akses"
        subtitle={`${users.length} akun user · kelola role & status akun`}
        actions={
          <ButtonLink href="/admin/users/new">
            <Plus size={17} /> Buat akun
          </ButtonLink>
        }
      />

      <section className={styles.summary} aria-label="Ringkasan user">
        <div>
          <strong>{users.filter((user) => accountStatus(user) === "ACTIVE").length}</strong>
          <span>Akun aktif</span>
        </div>
        <div>
          <strong>
            {users.filter((user) => user.brokerProfile?.verificationStatus === "PENDING_REVIEW").length}
          </strong>
          <span>Menunggu verifikasi broker</span>
        </div>
        <div>
          <strong>{users.filter((user) => accountStatus(user) !== "ACTIVE").length}</strong>
          <span>Nonaktif / terhapus</span>
        </div>
      </section>

      <section className={styles.toolbar} aria-label="Cari dan filter user">
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Cari user</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau email…" />
        </label>
        <div className={styles.filters}>
          <Filter size={16} aria-hidden="true" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status">
            <option value="ALL">Semua status</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter role">
            <option value="ALL">Semua role</option>
            {Object.entries(roleLabel).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {filteredUsers.length ? (
        <div className={styles.directory}>
          <div className={styles.tableHeader} aria-hidden="true">
            <span>User</span>
            <span>Role</span>
            <span>Status akun</span>
            <span>Profil broker</span>
            <span>Bergabung</span>
          </div>
          {filteredUsers.map((user) => {
            const userStatus = accountStatus(user);
            const initials = (user.name || user.email || "U").charAt(0).toUpperCase();
            return (
              <Link key={user.id} href={`/admin/users/${user.id}`} className={styles.row}>
                <span className={styles.person}>
                  <span className={styles.avatar}>{initials}</span>
                  <span>
                    <strong>{user.name || "(tanpa nama)"}</strong>
                    <small>{user.email}</small>
                  </span>
                </span>
                <span className={styles.roleCell}>{roleLabel[user.platformRole]}</span>
                <span className={styles.statusCell}>
                  <StatusBadge tone={statusTone[userStatus]}>{statusLabel[userStatus]}</StatusBadge>
                </span>
                <span className={styles.brokerCell}>
                  {user.brokerProfile ? (
                    <>
                      <strong>{verificationLabel[user.brokerProfile.verificationStatus] ?? user.brokerProfile.verificationStatus}</strong>
                      <small>{user.brokerProfile.city ? `${user.brokerProfile.city}${user.brokerProfile.province ? `, ${user.brokerProfile.province}` : ""}` : "Wilayah belum diisi"}</small>
                    </>
                  ) : (
                    <small>—</small>
                  )}
                </span>
                <span className={styles.joinedCell}>
                  <small>{formatDate(user.createdAt)}</small>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <UsersRound size={22} aria-hidden="true" />
          <strong>Tidak ada akun yang cocok</strong>
          <span>Ubah kata kunci atau filter pencarian.</span>
        </div>
      )}
    </RecordPage>
  );
}
