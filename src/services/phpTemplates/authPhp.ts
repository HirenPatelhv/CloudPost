import rawAuthPhp from '../../../php_shared_hosting/auth.php?raw';

export function getAuthPhpCode(): string {
  return rawAuthPhp;
}
