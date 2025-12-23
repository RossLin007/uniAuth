/**
 * Terms of Service Page
 * 服务条款页面
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function TermsPage() {
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
                <h1>{isZh ? '服务条款' : 'Terms of Service'}</h1>
                <p className="last-updated">
                    {isZh ? '最后更新：2025年12月22日' : 'Last Updated: December 22, 2025'}
                </p>

                {isZh ? (
                    // Chinese Version
                    <>
                        <section>
                            <h2>1. 条款接受</h2>
                            <p>
                                访问或使用 UniAuth（"服务"）即表示您同意受本服务条款（"条款"）的约束。
                                如果您不同意这些条款，则不得使用本服务。
                            </p>
                        </section>

                        <section>
                            <h2>2. 服务说明</h2>
                            <p>UniAuth 是一个统一身份认证平台，提供以下服务：</p>
                            <ul>
                                <li>手机号码验证和登录</li>
                                <li>邮箱认证</li>
                                <li>OAuth 2.0 提供商能力</li>
                                <li>JWT 令牌管理</li>
                                <li>多设备会话管理</li>
                                <li>第三方应用集成</li>
                            </ul>
                        </section>

                        <section>
                            <h2>3. 账户注册</h2>
                            <h3>3.1 资格要求</h3>
                            <p>您必须年满 18 周岁或在您所在司法管辖区已达到法定成年年龄才能使用本服务。</p>

                            <h3>3.2 账户信息</h3>
                            <p>
                                您同意在注册时提供准确、最新和完整的信息，
                                并及时更新以保持信息的准确性、时效性和完整性。
                            </p>

                            <h3>3.3 账户安全</h3>
                            <p>
                                您有责任维护账户凭证的保密性，并对在您账户下发生的所有活动负责。
                                您必须立即通知我们任何未经授权使用您账户的情况。
                            </p>
                        </section>

                        <section>
                            <h2>4. 用户行为规范</h2>
                            <p>您同意不会：</p>
                            <ul>
                                <li>将本服务用于任何非法目的或违反任何适用法律法规</li>
                                <li>试图未经授权访问本服务、其他账户、计算机系统或与本服务相连的网络</li>
                                <li>未经我们明确书面许可，使用任何自动化手段访问本服务</li>
                                <li>干扰或中断本服务的完整性或性能</li>
                                <li>传播任何病毒、蠕虫或具有破坏性的内容</li>
                                <li>使用本服务发送垃圾邮件、钓鱼信息或其他未经请求的通信</li>
                            </ul>
                        </section>

                        <section>
                            <h2>5. 开发者和 API 使用</h2>
                            <p>集成我们 OAuth 2.0 提供商服务的开发者必须：</p>
                            <ul>
                                <li>遵守所有 API 文档和指南</li>
                                <li>实施适当的安全措施（包括公共客户端使用 PKCE）</li>
                                <li>安全存储用户数据并遵守适用的隐私法律</li>
                                <li>不超过速率限制或滥用 API</li>
                            </ul>
                        </section>

                        <section>
                            <h2>6. 免责声明</h2>
                            <p>
                                本服务按"现状"和"可用"的基础提供，不提供任何明示或暗示的保证。
                                我们不保证服务将不间断、及时、安全或无错误。
                            </p>
                        </section>

                        <section>
                            <h2>7. 责任限制</h2>
                            <p>
                                在法律允许的最大范围内，UniAuth 及其董事、员工、合作伙伴在任何情况下
                                均不对任何间接、附带、特殊、后果性或惩罚性损害承担责任。
                            </p>
                        </section>

                        <section>
                            <h2>8. 适用法律</h2>
                            <p>本条款应受中华人民共和国法律管辖并按其解释。</p>
                        </section>

                        <section>
                            <h2>9. 联系方式</h2>
                            <p>如果您对本条款有任何疑问，请通过以下方式联系我们：</p>
                            <ul>
                                <li>电子邮件：legal@uniauth.example.com</li>
                            </ul>
                        </section>
                    </>
                ) : (
                    // English Version
                    <>
                        <section>
                            <h2>1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using UniAuth ("Service"), you agree to be bound by these
                                Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
                            </p>
                        </section>

                        <section>
                            <h2>2. Description of Service</h2>
                            <p>UniAuth is a unified authentication platform that provides:</p>
                            <ul>
                                <li>Phone number verification and login</li>
                                <li>Email authentication</li>
                                <li>OAuth 2.0 provider capabilities</li>
                                <li>JWT token management</li>
                                <li>Multi-device session management</li>
                                <li>Third-party application integration</li>
                            </ul>
                        </section>

                        <section>
                            <h2>3. Account Registration</h2>
                            <h3>3.1 Eligibility</h3>
                            <p>
                                You must be at least 18 years old or have reached the age of majority
                                in your jurisdiction to use this Service.
                            </p>

                            <h3>3.2 Account Information</h3>
                            <p>
                                You agree to provide accurate, current, and complete information during
                                registration and to update such information to keep it accurate, current, and complete.
                            </p>

                            <h3>3.3 Account Security</h3>
                            <p>
                                You are responsible for maintaining the confidentiality of your account credentials
                                and for all activities that occur under your account. You must immediately notify us
                                of any unauthorized use of your account.
                            </p>
                        </section>

                        <section>
                            <h2>4. User Conduct</h2>
                            <p>You agree not to:</p>
                            <ul>
                                <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
                                <li>Attempt to gain unauthorized access to the Service or related systems</li>
                                <li>Use any automated means to access the Service without our express permission</li>
                                <li>Interfere with or disrupt the integrity or performance of the Service</li>
                                <li>Transmit any viruses, worms, or items of a destructive nature</li>
                                <li>Use the Service to send spam or unsolicited communications</li>
                            </ul>
                        </section>

                        <section>
                            <h2>5. Developer and API Usage</h2>
                            <p>Developers who integrate with our OAuth 2.0 provider services must:</p>
                            <ul>
                                <li>Comply with all API documentation and guidelines</li>
                                <li>Implement proper security measures (including PKCE for public clients)</li>
                                <li>Store user data securely and in compliance with applicable privacy laws</li>
                                <li>Not exceed rate limits or abuse the API</li>
                            </ul>
                        </section>

                        <section>
                            <h2>6. Disclaimers</h2>
                            <p>
                                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS,
                                WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                                WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE.
                            </p>
                        </section>

                        <section>
                            <h2>7. Limitation of Liability</h2>
                            <p>
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, UNIAUTH AND ITS DIRECTORS, EMPLOYEES,
                                AND PARTNERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                                CONSEQUENTIAL, OR PUNITIVE DAMAGES.
                            </p>
                        </section>

                        <section>
                            <h2>8. Governing Law</h2>
                            <p>
                                These Terms shall be governed by and construed in accordance with the laws
                                of the People's Republic of China.
                            </p>
                        </section>

                        <section>
                            <h2>9. Contact Information</h2>
                            <p>If you have any questions about these Terms, please contact us at:</p>
                            <ul>
                                <li>Email: legal@uniauth.example.com</li>
                            </ul>
                        </section>
                    </>
                )}

                <div className="legal-footer">
                    <p>
                        {isZh
                            ? '查看完整条款请访问我们的 GitHub 仓库。'
                            : 'For the complete terms, please visit our GitHub repository.'}
                    </p>
                    <Link to="/privacy" className="legal-link">
                        {isZh ? '隐私政策' : 'Privacy Policy'} →
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
                }
            `}</style>
        </div>
    );
}

export default TermsPage;
