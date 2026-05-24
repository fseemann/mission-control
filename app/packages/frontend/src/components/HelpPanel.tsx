import React, { useState } from 'react';
import { useWidgetStore } from '../store/useWidgetStore';

const FETCH_EXAMPLE_CODE = `/**
 * Example 1: HTTP Status Inspector
 * Fetches a URL and verifies that the status is 200 OK.
 * Demonstrates access to environment variables.
 */
export async function run({ env }: { env: Record<string, string> }) {
  const url = env.TARGET_URL || 'https://httpbin.org/status/200';
  
  try {
    const start = Date.now();
    const res = await fetch(url);
    const duration = Date.now() - start;
    
    if (res.ok) {
      return {
        status: 'ok' as const,
        message: \`Successfully connected to \${url} in \${duration}ms\`,
        output: {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          durationMs: duration
        }
      };
    } else {
      return {
        status: 'degraded' as const,
        message: \`Fetched \${url} but got status: \${res.status} \${res.statusText}\`,
        output: {
          status: res.status,
          ok: res.ok
        }
      };
    }
  } catch (err: any) {
    return {
      status: 'fail' as const,
      message: \`Failed to fetch \${url}: \${err.message}\`
    };
  }
}`;

const TLS_EXAMPLE_CODE = `/**
 * Example 2: TLS Certificate Verifier
 * Uses the Node/Bun built-in \`node:tls\` library to connect to a server
 * and verify that its SSL/TLS certificate is valid and not expiring soon.
 */
import tls from 'node:tls';

export async function run({ env }: { env: Record<string, string> }) {
  const host = env.CHECK_HOST || 'google.com';
  const port = Number(env.CHECK_PORT || '443');
  const warningDays = Number(env.WARNING_DAYS || '30');

  return new Promise((resolve) => {
    // Connect to target host via TLS
    const socket = tls.connect({
      host,
      port,
      servername: host, // Crucial for SNI
      rejectUnauthorized: false // Allow connecting even if invalid to inspect details
    }, () => {
      const cert = socket.getPeerCertificate(true);
      const authorized = socket.authorized;
      const authError = socket.authorizationError;

      socket.end(); // Close connection

      if (!cert || Object.keys(cert).length === 0) {
        resolve({
          status: 'fail' as const,
          message: \`No TLS certificate received from \${host}:\${port}\`
        });
        return;
      }

      const validTo = cert.valid_to;
      const validFrom = cert.valid_from;
      const expiryDate = new Date(validTo);
      const daysRemaining = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      const certInfo = {
        authorized,
        authError,
        subject: cert.subject.CN,
        issuer: cert.issuer.CN,
        validFrom,
        validTo,
        daysRemaining
      };

      if (!authorized) {
        resolve({
          status: 'fail' as const,
          message: \`TLS Verification Failed: \${authError}\`,
          output: certInfo
        });
      } else if (daysRemaining <= warningDays) {
        resolve({
          status: 'degraded' as const,
          message: \`Certificate is valid but expires in \${daysRemaining} days (on \${validTo})\`,
          output: certInfo
        });
      } else {
        resolve({
          status: 'ok' as const,
          message: \`TLS certificate is valid. Expires in \${daysRemaining} days.\`,
          output: certInfo
        });
      }
    });

    socket.on('error', (err) => {
      resolve({
        status: 'fail' as const,
        message: \`TLS Connection to \${host}:\${port} failed: \${err.message}\`
      });
    });
  });
}`;

export const HelpPanel: React.FC = () => {
  const isHelpOpen = useWidgetStore((state) => state.isHelpOpen);
  const setHelpOpen = useWidgetStore((state) => state.setHelpOpen);
  const [copiedType, setCopiedType] = useState<'fetch' | 'tls' | null>(null);

  const handleCopy = (code: string, type: 'fetch' | 'tls') => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    });
  };

  return (
    <div className={`help-panel ${isHelpOpen ? 'open' : ''}`}>
      <div className="help-header">
        <h3 className="help-title">🛰️ Scripting Guide & Examples</h3>
        <button className="close-btn" onClick={() => setHelpOpen(false)} title="Close Panel">
          &times;
        </button>
      </div>

      <div className="help-body">
        <section className="help-section">
          <h4>Overview</h4>
          <p>
            Status Widgets execute <strong>TypeScript (TS) / JavaScript (JS)</strong> code
            in an isolated child process powered by <strong>Bun</strong>.
          </p>
          <p>
            Your script must export an <code>async run</code> function that receives the
            widget's environment variables and returns a structured result.
          </p>
        </section>

        <section className="help-section">
          <h4>The Script Contract</h4>
          <div className="contract-box">
            <h5>Expected Entry Point</h5>
            <pre className="help-code-snippet">
{`export async function run({ env }: { env: Record<string, string> }) {
  // Your code here...
}`}
            </pre>
            <h5>Expected Return Value</h5>
            <pre className="help-code-snippet">
{`{
  status: 'ok' | 'degraded' | 'fail',
  message?: string, // A short description shown in status summary
  output?: any      // Any JSON-serializable data logged under Output
}`}
            </pre>
            <h5>Accessing Environment Variables</h5>
            <p>
              Variables defined in the <strong>Environment Variables</strong> table are decryptable at execution-time
              and made available inside the <code>env</code> object parameter (e.g. <code>env.TARGET_URL</code>).
            </p>
          </div>
        </section>

        <section className="help-section">
          <div className="example-header">
            <h4>Example 1: HTTP Status Checker</h4>
            <button 
              className={`copy-btn ${copiedType === 'fetch' ? 'copied' : ''}`}
              onClick={() => handleCopy(FETCH_EXAMPLE_CODE, 'fetch')}
            >
              {copiedType === 'fetch' ? '✅ Copied!' : '📋 Copy Code'}
            </button>
          </div>
          <p className="example-description">
            Fetches a URL from environment variables (or falls back to a default) and updates the widget status based on the HTTP response code.
          </p>
          <div className="code-container">
            <pre className="example-code-pre">
              <code>{FETCH_EXAMPLE_CODE}</code>
            </pre>
          </div>
        </section>

        <section className="help-section">
          <div className="example-header">
            <h4>Example 2: TLS Certificate Verifier</h4>
            <button 
              className={`copy-btn ${copiedType === 'tls' ? 'copied' : ''}`}
              onClick={() => handleCopy(TLS_EXAMPLE_CODE, 'tls')}
            >
              {copiedType === 'tls' ? '✅ Copied!' : '📋 Copy Code'}
            </button>
          </div>
          <p className="example-description">
            Connects to a server using the built-in Node/Bun <code>node:tls</code> library to verify if the certificate is authorized and alerts if it is expiring within 30 days.
          </p>
          <div className="code-container">
            <pre className="example-code-pre">
              <code>{TLS_EXAMPLE_CODE}</code>
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HelpPanel;
