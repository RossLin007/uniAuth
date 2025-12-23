/**
 * Privacy Policy Page
 * 隐私政策页面
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function PrivacyPage() {
    const { t, i18n } = useTranslation();
    const isZh = i18n.language.startsWith('zh');

    return (
        <div className="legal-page">
            <div className="legal-header">
                <Link to="/" className="back-link">
                    ← {t('common.back', 'Back')}
                </Link>
                <div className="language-toggle">
                    <button
                        className={!isZh ? 'active' : ''}
                        onClick={() => i18n.changeLanguage('en')}
                    >
                        EN
                    </button>
                    <button
                        className={isZh ? 'active' : ''}
                        onClick={() => i18n.changeLanguage('zh')}
                    >
                        中文
                    </button>
                </div>
            </div>

            <article className="legal-content">
                <h1>{isZh ? '隐私政策' : 'Privacy Policy'}</h1>
                <p className="last-updated">
                    {isZh ? '最后更新：2025年12月22日' : 'Last Updated: December 22, 2025'}
                </p>

                {isZh ? (
                    // Chinese Version
                    <>
                        <section>
                            <h2>1. 简介</h2>
                            <p>
                                UniAuth（"我们"）致力于保护您的隐私。本隐私政策说明了在您使用我们的
                                统一身份认证服务（"服务"）时，我们如何收集、使用、披露和保护您的信息。
                            </p>
                        </section>

                        <section>
                            <h2>2. 我们收集的信息</h2>

                            <h3>2.1 个人信息</h3>
                            <p>当您注册或使用我们的服务时，我们可能会收集以下个人信息：</p>
                            <p><strong>必需信息：</strong></p>
                            <ul>
                                <li><strong>手机号码</strong>：用于通过短信认证进行账户验证和登录</li>
                                <li><strong>电子邮箱</strong>：用于账户验证、登录和通信</li>
                            </ul>
                            <p><strong>可选信息：</strong></p>
                            <ul>
                                <li><strong>显示名称/昵称</strong>：显示在您的个人资料中</li>
                                <li><strong>头像</strong>：显示在您的个人资料中</li>
                            </ul>

                            <h3>2.2 使用信息</h3>
                            <p>当您使用我们的服务时，我们会自动收集某些信息：</p>
                            <ul>
                                <li>设备信息（设备类型、操作系统、浏览器类型）</li>
                                <li>IP 地址（用于安全和速率限制）</li>
                                <li>访问日志（访问日期和时间、执行的操作）</li>
                                <li>会话信息（登录会话、设备标识符）</li>
                            </ul>
                        </section>

                        <section>
                            <h2>3. 我们如何使用您的信息</h2>
                            <p>我们将收集的信息用于以下目的：</p>
                            <ul>
                                <li><strong>服务提供</strong>：验证您的身份、提供账户访问、处理登录请求</li>
                                <li><strong>安全</strong>：防止未经授权的访问、检测和防止欺诈</li>
                                <li><strong>通信</strong>：发送验证码、通知安全事件、回复咨询</li>
                                <li><strong>改进</strong>：分析使用模式以改进服务</li>
                            </ul>
                        </section>

                        <section>
                            <h2>4. 信息共享和披露</h2>

                            <h3>4.1 第三方应用</h3>
                            <p>当您授权第三方应用访问您的账户时，我们会共享：</p>
                            <ul>
                                <li>您的用户 ID</li>
                                <li>您明确同意共享的信息</li>
                                <li>仅限您批准的权限</li>
                            </ul>

                            <h3>4.2 服务提供商</h3>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>服务类型</th>
                                        <th>提供商</th>
                                        <th>用途</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>数据库</td>
                                        <td>Supabase</td>
                                        <td>数据存储</td>
                                    </tr>
                                    <tr>
                                        <td>短信</td>
                                        <td>腾讯云</td>
                                        <td>验证码</td>
                                    </tr>
                                    <tr>
                                        <td>缓存</td>
                                        <td>Upstash Redis</td>
                                        <td>性能优化</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section>
                            <h2>5. 数据保留</h2>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>数据类型</th>
                                        <th>保留期限</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>账户信息</td>
                                        <td>直到账户删除</td>
                                    </tr>
                                    <tr>
                                        <td>验证码</td>
                                        <td>5 分钟</td>
                                    </tr>
                                    <tr>
                                        <td>访问令牌</td>
                                        <td>1 小时</td>
                                    </tr>
                                    <tr>
                                        <td>刷新令牌</td>
                                        <td>30 天</td>
                                    </tr>
                                    <tr>
                                        <td>审计日志</td>
                                        <td>90 天</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section>
                            <h2>6. 数据安全</h2>
                            <p>我们实施行业标准安全措施来保护您的信息：</p>
                            <ul>
                                <li><strong>传输加密</strong>：所有传输数据使用 TLS 1.2+</li>
                                <li><strong>密码哈希</strong>：使用 bcrypt 安全哈希</li>
                                <li><strong>令牌安全</strong>：安全随机生成，短有效期</li>
                                <li><strong>速率限制</strong>：防止暴力攻击</li>
                            </ul>
                        </section>

                        <section>
                            <h2>7. 您的权利</h2>
                            <p>您对个人信息享有以下权利：</p>
                            <ul>
                                <li><strong>访问权</strong>：查看您的个人信息</li>
                                <li><strong>更正权</strong>：更新您的个人信息</li>
                                <li><strong>删除权</strong>：删除您的账户及所有相关数据</li>
                                <li><strong>数据可携权</strong>：请求以机器可读格式获取数据副本</li>
                                <li><strong>撤销权</strong>：撤销第三方应用的访问权限</li>
                            </ul>
                        </section>

                        <section>
                            <h2>8. Cookie 和追踪</h2>
                            <p>我们的服务使用最少的 Cookie：</p>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Cookie</th>
                                        <th>用途</th>
                                        <th>时长</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>uniauth_access_token</td>
                                        <td>认证</td>
                                        <td>1 小时</td>
                                    </tr>
                                    <tr>
                                        <td>uniauth_refresh_token</td>
                                        <td>会话刷新</td>
                                        <td>30 天</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p>我们<strong>不使用</strong>第三方广告 Cookie 或跨站追踪。</p>
                        </section>

                        <section>
                            <h2>9. 儿童隐私</h2>
                            <p>
                                我们的服务不面向 18 岁以下的儿童。我们不会故意收集 18 岁以下儿童的个人信息。
                            </p>
                        </section>

                        <section>
                            <h2>10. 联系我们</h2>
                            <p>如果您对本隐私政策有疑问，请联系我们：</p>
                            <ul>
                                <li>电子邮件：privacy@uniauth.example.com</li>
                            </ul>
                            <p>我们将在 30 天内回复您的咨询。</p>
                        </section>
                    </>
                ) : (
                    // English Version
                    <>
                        <section>
                            <h2>1. Introduction</h2>
                            <p>
                                UniAuth ("we", "our", or "us") is committed to protecting your privacy.
                                This Privacy Policy explains how we collect, use, disclose, and safeguard
                                your information when you use our unified authentication service ("Service").
                            </p>
                        </section>

                        <section>
                            <h2>2. Information We Collect</h2>

                            <h3>2.1 Personal Information</h3>
                            <p>When you register for or use our Service, we may collect the following:</p>
                            <p><strong>Required Information:</strong></p>
                            <ul>
                                <li><strong>Phone Number</strong>: Used for account verification and login via SMS</li>
                                <li><strong>Email Address</strong>: Used for account verification, login, and communication</li>
                            </ul>
                            <p><strong>Optional Information:</strong></p>
                            <ul>
                                <li><strong>Display Name/Nickname</strong>: Shown in your profile</li>
                                <li><strong>Profile Picture</strong>: Displayed in your profile</li>
                            </ul>

                            <h3>2.2 Usage Information</h3>
                            <p>We automatically collect certain information when you use our Service:</p>
                            <ul>
                                <li>Device information (device type, OS, browser type)</li>
                                <li>IP address (used for security and rate limiting)</li>
                                <li>Access logs (date, time, actions performed)</li>
                                <li>Session information (login sessions, device identifiers)</li>
                            </ul>
                        </section>

                        <section>
                            <h2>3. How We Use Your Information</h2>
                            <p>We use the collected information for:</p>
                            <ul>
                                <li><strong>Service Provision</strong>: Authenticate identity, provide account access, process logins</li>
                                <li><strong>Security</strong>: Protect against unauthorized access, detect fraud</li>
                                <li><strong>Communication</strong>: Send verification codes, security notifications, respond to inquiries</li>
                                <li><strong>Improvement</strong>: Analyze usage patterns to improve the Service</li>
                            </ul>
                        </section>

                        <section>
                            <h2>4. Information Sharing and Disclosure</h2>

                            <h3>4.1 Third-Party Applications</h3>
                            <p>When you authorize a third-party application, we share:</p>
                            <ul>
                                <li>Your user ID</li>
                                <li>Information you explicitly consent to share</li>
                                <li>Only the permissions (scopes) you approve</li>
                            </ul>

                            <h3>4.2 Service Providers</h3>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Service Type</th>
                                        <th>Provider</th>
                                        <th>Purpose</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Database</td>
                                        <td>Supabase</td>
                                        <td>Data storage</td>
                                    </tr>
                                    <tr>
                                        <td>SMS</td>
                                        <td>Tencent Cloud</td>
                                        <td>Verification codes</td>
                                    </tr>
                                    <tr>
                                        <td>Caching</td>
                                        <td>Upstash Redis</td>
                                        <td>Performance</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section>
                            <h2>5. Data Retention</h2>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Data Type</th>
                                        <th>Retention Period</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Account Information</td>
                                        <td>Until account deletion</td>
                                    </tr>
                                    <tr>
                                        <td>Verification Codes</td>
                                        <td>5 minutes</td>
                                    </tr>
                                    <tr>
                                        <td>Access Tokens</td>
                                        <td>1 hour</td>
                                    </tr>
                                    <tr>
                                        <td>Refresh Tokens</td>
                                        <td>30 days</td>
                                    </tr>
                                    <tr>
                                        <td>Audit Logs</td>
                                        <td>90 days</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section>
                            <h2>6. Data Security</h2>
                            <p>We implement industry-standard security measures:</p>
                            <ul>
                                <li><strong>Encryption in Transit</strong>: All data transmitted using TLS 1.2+</li>
                                <li><strong>Password Hashing</strong>: bcrypt with appropriate cost factor</li>
                                <li><strong>Token Security</strong>: Secure random generation, short expiration</li>
                                <li><strong>Rate Limiting</strong>: Protection against brute-force attacks</li>
                            </ul>
                        </section>

                        <section>
                            <h2>7. Your Rights</h2>
                            <p>You have the following rights regarding your personal information:</p>
                            <ul>
                                <li><strong>Access</strong>: View your personal information</li>
                                <li><strong>Correction</strong>: Update your personal information</li>
                                <li><strong>Deletion</strong>: Delete your account and all associated data</li>
                                <li><strong>Portability</strong>: Request a copy of your data in machine-readable format</li>
                                <li><strong>Revocation</strong>: Revoke third-party application access</li>
                            </ul>
                        </section>

                        <section>
                            <h2>8. Cookies and Tracking</h2>
                            <p>Our Service uses minimal cookies:</p>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Cookie</th>
                                        <th>Purpose</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>uniauth_access_token</td>
                                        <td>Authentication</td>
                                        <td>1 hour</td>
                                    </tr>
                                    <tr>
                                        <td>uniauth_refresh_token</td>
                                        <td>Session refresh</td>
                                        <td>30 days</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p>We do <strong>NOT</strong> use third-party advertising cookies or cross-site tracking.</p>
                        </section>

                        <section>
                            <h2>9. Children's Privacy</h2>
                            <p>
                                Our Service is not intended for children under 18 years of age.
                                We do not knowingly collect personal information from children under 18.
                            </p>
                        </section>

                        <section>
                            <h2>10. Contact Us</h2>
                            <p>If you have questions about this Privacy Policy, please contact us:</p>
                            <ul>
                                <li>Email: privacy@uniauth.example.com</li>
                            </ul>
                            <p>We will respond to your inquiry within 30 days.</p>
                        </section>
                    </>
                )}

                <div className="legal-footer">
                    <p>
                        {isZh
                            ? '查看完整政策请访问我们的 GitHub 仓库。'
                            : 'For the complete policy, please visit our GitHub repository.'}
                    </p>
                    <Link to="/terms" className="legal-link">
                        {isZh ? '服务条款' : 'Terms of Service'} →
                    </Link>
                </div>
            </article>

            <style>{`
                .legal-page {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 2rem;
                    background: var(--color-bg-primary, #fff);
                    min-height: 100vh;
                }

                .legal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--color-border, #e5e7eb);
                }

                .back-link {
                    color: var(--color-primary, #0ea5e9);
                    text-decoration: none;
                    font-weight: 500;
                }

                .back-link:hover {
                    text-decoration: underline;
                }

                .language-toggle {
                    display: flex;
                    gap: 0.5rem;
                }

                .language-toggle button {
                    padding: 0.5rem 1rem;
                    border: 1px solid var(--color-border, #e5e7eb);
                    background: var(--color-bg-secondary, #f8fafc);
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }

                .language-toggle button.active {
                    background: var(--color-primary, #0ea5e9);
                    color: white;
                    border-color: var(--color-primary, #0ea5e9);
                }

                .legal-content {
                    color: var(--color-text-primary, #1e293b);
                    line-height: 1.75;
                }

                .legal-content h1 {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    color: var(--color-text-primary, #1e293b);
                }

                .last-updated {
                    color: var(--color-text-secondary, #64748b);
                    font-size: 0.875rem;
                    margin-bottom: 2rem;
                }

                .legal-content section {
                    margin-bottom: 2rem;
                }

                .legal-content h2 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    color: var(--color-text-primary, #1e293b);
                }

                .legal-content h3 {
                    font-size: 1rem;
                    font-weight: 600;
                    margin: 1rem 0 0.5rem;
                    color: var(--color-text-primary, #1e293b);
                }

                .legal-content p {
                    margin-bottom: 1rem;
                    color: var(--color-text-secondary, #475569);
                }

                .legal-content ul {
                    margin: 0.5rem 0 1rem 1.5rem;
                    color: var(--color-text-secondary, #475569);
                }

                .legal-content li {
                    margin-bottom: 0.5rem;
                }

                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1rem 0;
                    font-size: 0.875rem;
                }

                .data-table th,
                .data-table td {
                    padding: 0.75rem;
                    text-align: left;
                    border: 1px solid var(--color-border, #e5e7eb);
                }

                .data-table th {
                    background: var(--color-bg-secondary, #f8fafc);
                    font-weight: 600;
                    color: var(--color-text-primary, #1e293b);
                }

                .data-table td {
                    color: var(--color-text-secondary, #475569);
                }

                .legal-footer {
                    margin-top: 3rem;
                    padding-top: 2rem;
                    border-top: 1px solid var(--color-border, #e5e7eb);
                    text-align: center;
                }

                .legal-footer p {
                    color: var(--color-text-tertiary, #94a3b8);
                    font-size: 0.875rem;
                }

                .legal-link {
                    color: var(--color-primary, #0ea5e9);
                    text-decoration: none;
                    font-weight: 500;
                }

                .legal-link:hover {
                    text-decoration: underline;
                }

                @media (max-width: 640px) {
                    .legal-page {
                        padding: 1rem;
                    }

                    .legal-content h1 {
                        font-size: 1.5rem;
                    }

                    .data-table {
                        font-size: 0.75rem;
                    }

                    .data-table th,
                    .data-table td {
                        padding: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default PrivacyPage;
