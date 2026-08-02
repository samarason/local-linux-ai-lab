import { RAGDocument } from '../types';

export const INITIAL_RAG_DOCS: RAGDocument[] = [
  {
    id: 'man-apt-1',
    title: 'APT Command Reference (Debian/Ubuntu)',
    source: '/usr/share/man/man8/apt.8.gz',
    distroTag: 'debian',
    chunkCount: 3,
    content: `APT(8) - Advanced Package Tool for Debian and Ubuntu Linux.
NAME: apt - command-line interface for package management.
USAGE:
  apt update: Synchronizes index files from sources listed in /etc/apt/sources.list.
  apt upgrade: Installs available upgrades of all packages installed on the system.
  apt install -y <package>: Installs one or more packages non-interactively.
  apt remove <package>: Removes packages; configuration files remain.
  apt purge <package>: Removes packages along with configuration files.
CONFIG: /etc/apt/sources.list, /etc/apt/apt.conf.d/
SECURITY: Signed GPG keys in /etc/apt/trusted.gpg.d/`,
    createdAt: new Date().toISOString(),
    fileSize: '14.2 KB',
  },
  {
    id: 'man-dnf-8',
    title: 'DNF Package Manager Handbook (RHEL/Fedora/Rocky)',
    source: '/usr/share/man/man8/dnf.8.gz',
    distroTag: 'redhat',
    chunkCount: 3,
    content: `DNF(8) - Next-generation package manager for Red Hat Enterprise Linux, Fedora, and Rocky Linux.
NAME: dnf - Dandified YUM package manager.
USAGE:
  dnf check-update: Checks for updated packages.
  dnf update / dnf upgrade: Updates packages to newest version.
  dnf install -y <package>: Installs specified packages non-interactively.
  dnf remove <package>: Uninstalls packages.
  dnf groupinstall "Development Tools": Installs RPM package groups.
CONFIG: /etc/dnf/dnf.conf, /etc/yum.repos.d/
SECURITY: RPM GPG verification configured per repository file.`,
    createdAt: new Date().toISOString(),
    fileSize: '18.7 KB',
  },
  {
    id: 'man-netplan-5',
    title: 'Netplan YAML Network Configuration Guide (Ubuntu/Debian)',
    source: '/etc/netplan/01-netcfg.yaml',
    distroTag: 'debian',
    chunkCount: 2,
    content: `NETPLAN(5) - Network configuration abstraction for Ubuntu/Debian.
DESCRIPTION: Netplan reads YAML files from /etc/netplan/*.yaml to configure systemd-networkd or NetworkManager backends.
EXAMPLE CONFIG:
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: no
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
COMMANDS:
  netplan try: Apply config with auto-rollback after timeout.
  netplan apply: Apply netplan configuration directly.`,
    createdAt: new Date().toISOString(),
    fileSize: '8.4 KB',
  },
  {
    id: 'man-nmcli-1',
    title: 'NetworkManager Command-Line Tool nmcli (RHEL/CentOS)',
    source: '/usr/share/man/man1/nmcli.1.gz',
    distroTag: 'redhat',
    chunkCount: 2,
    content: `NMCLI(1) - Command-line tool for controlling NetworkManager on Red Hat systems.
DESCRIPTION: nmcli is used for creating, displaying, editing, deleting, activating, and deactivating network connections.
USAGE:
  nmcli device status: Show network interface status.
  nmcli connection add type ethernet con-name eth0 ifname eth0 ip4 192.168.1.100/24 gw4 192.168.1.1
  nmcli connection modify eth0 ipv4.dns "8.8.8.8 1.1.1.1"
  nmcli connection up eth0
CONFIG FILES: /etc/NetworkManager/system-connections/`,
    createdAt: new Date().toISOString(),
    fileSize: '22.1 KB',
  },
  {
    id: 'man-ufw-8',
    title: 'UFW Uncomplicated Firewall (Debian/Ubuntu)',
    source: '/usr/share/man/man8/ufw.8.gz',
    distroTag: 'debian',
    chunkCount: 2,
    content: `UFW(8) - Program for managing a netfilter firewall on Debian and Ubuntu.
USAGE:
  ufw status verbose: Check firewall status and rule list.
  ufw enable: Enable firewall on startup.
  ufw allow 22/tcp: Allow SSH incoming traffic.
  ufw allow 80/tcp: Allow HTTP.
  ufw allow 443/tcp: Allow HTTPS.
  ufw default deny incoming: Set default policy for incoming packets.`,
    createdAt: new Date().toISOString(),
    fileSize: '11.5 KB',
  },
  {
    id: 'man-firewalld-1',
    title: 'Firewalld & firewall-cmd (RHEL/Fedora/Rocky)',
    source: '/usr/share/man/man1/firewall-cmd.1.gz',
    distroTag: 'redhat',
    chunkCount: 2,
    content: `FIREWALL-CMD(1) - Dynamic firewall manager tool on Red Hat Enterprise Linux.
USAGE:
  firewall-cmd --state: Check if firewalld daemon is active.
  firewall-cmd --get-active-zones: List active zones.
  firewall-cmd --zone=public --add-service=http --permanent: Allow HTTP service permanently.
  firewall-cmd --zone=public --add-port=8080/tcp --permanent: Allow custom port.
  firewall-cmd --reload: Reload rules from permanent config.`,
    createdAt: new Date().toISOString(),
    fileSize: '16.3 KB',
  },
  {
    id: 'man-selinux-8',
    title: 'SELinux Administration Guide (Red Hat Family)',
    source: '/usr/share/man/man8/selinux.8.gz',
    distroTag: 'redhat',
    chunkCount: 3,
    content: `SELINUX(8) - NSA Security-Enhanced Linux mandatory access control (MAC) for Red Hat distros.
COMMANDS:
  sestatus: View current SELinux status and policy type.
  getenforce: Returns Enforcing, Permissive, or Disabled.
  setenforce 0: Temporarily switch to Permissive mode for debugging.
  chcon -t httpd_sys_content_t /var/www/html/file: Change SELinux security context.
  restorecon -v -R /var/www/html: Restore default SELinux context recursively.
  semanage port -a -t http_port_t -p tcp 8080: Allow Apache/Nginx to bind custom port.`,
    createdAt: new Date().toISOString(),
    fileSize: '25.0 KB',
  },
  {
    id: 'man-apparmor-7',
    title: 'AppArmor Mandatory Access Control (Debian Family)',
    source: '/usr/share/man/man7/apparmor.7.gz',
    distroTag: 'debian',
    chunkCount: 2,
    content: `APPARMOR(7) - Linux application security system for Ubuntu/Debian.
COMMANDS:
  aa-status: Display current status of AppArmor profiles.
  aa-complain /path/to/bin: Put profile in complain mode (logs violations without blocking).
  aa-enforce /path/to/bin: Put profile in enforce mode.
CONFIG FILES: /etc/apparmor.d/
LOGS: /var/log/syslog or journalctl -u apparmor`,
    createdAt: new Date().toISOString(),
    fileSize: '12.0 KB',
  },
  {
    id: 'man-systemd-1',
    title: 'Systemd Service & Unit Management (Universal)',
    source: '/usr/share/man/man1/systemctl.1.gz',
    distroTag: 'universal',
    chunkCount: 3,
    content: `SYSTEMCTL(1) - Control the systemd system and service manager across all Linux distributions.
COMMANDS:
  systemctl start <service>: Start a system service unit.
  systemctl stop <service>: Stop a service unit.
  systemctl restart <service>: Stop and start a service unit.
  systemctl status <service>: Show service status and recent journal logs.
  systemctl enable <service>: Enable service to start on boot.
  systemctl disable <service>: Prevent service auto-start.
  journalctl -u <service> -n 50 --no-pager: View last 50 log lines for unit.`,
    createdAt: new Date().toISOString(),
    fileSize: '28.4 KB',
  },
];
