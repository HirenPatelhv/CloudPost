import rawDiagnosticPhp from '../../../php_shared_hosting/diagnostic.php?raw';

export function getDiagnosticPhpCode(): string {
  return rawDiagnosticPhp;
}
