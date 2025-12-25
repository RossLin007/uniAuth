import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            // Common
            common: {
                back: 'Back',
                loading: 'Loading...',
                save: 'Save',
                cancel: 'Cancel',
                confirm: 'Confirm',
            },

            // General
            appName: 'UniAuth',
            tagline: 'One account, all services',

            // Login Page
            login: {
                title: 'Welcome Back',
                subtitle: 'Sign in to continue',
                phone: 'Phone Number',
                phonePlaceholder: '+86 138 0013 8000',
                phoneNumberPlaceholder: 'Enter phone number',
                fullPhoneNumber: 'Full number',
                email: 'Email',
                emailPlaceholder: 'you@example.com',
                nicknamePlaceholder: 'Nickname (optional)',
                password: 'Password',
                passwordPlaceholder: 'Enter your password',
                code: 'Verification Code',
                codePlaceholder: 'Enter 6-digit code',
                sendCode: 'Send Code',
                resendCode: 'Resend in {{seconds}}s',
                codeSentTip: 'Verification code has been sent to your email.',
                openInbox: 'Open {{provider}}',
                signIn: 'Sign In',
                signUp: 'Sign Up',
                or: 'or',
                continueWith: 'Continue with {{provider}}',
                noAccount: "Don't have an account?",
                hasAccount: 'Already have an account?',
                forgotPassword: 'Forgot password?',
                terms: 'By continuing, you agree to our',
                termsLink: 'Terms of Service',
                privacyLink: 'Privacy Policy',
                and: 'and',
            },

            // Tabs
            tabs: {
                phone: 'Phone',
                email: 'Email',
            },

            // Errors
            errors: {
                invalidPhone: 'Please enter a valid phone number',
                invalidEmail: 'Please enter a valid email',
                invalidCode: 'Please enter a valid 6-digit code',
                invalidPassword: 'Password must be at least 8 characters',
                sendCodeFailed: 'Failed to send verification code',
                loginFailed: 'Login failed, please try again',
                networkError: 'Network error, please check your connection',
            },

            // Success
            success: {
                codeSent: 'Verification code sent',
                loginSuccess: 'Login successful',
            },

            // OAuth Providers
            providers: {
                google: 'Google',
                github: 'GitHub',
                wechat: 'WeChat',
                apple: 'Apple',
            },

            // Email Verification
            emailVerify: {
                title: 'Verify Your Email',
                subtitle: 'We sent a verification code to',
                verify: 'Verify Email',
                resend: 'Resend Code',
                sendFailed: 'Failed to send verification code',
                verifyFailed: 'Verification failed, please try again',
                successTitle: 'Email Verified!',
                successMessage: 'Your email has been successfully verified.',
                info: 'The verification code will expire in 5 minutes',
            },

            // Home Page
            home: {
                signOut: 'Sign Out',
                activeSessions: 'Active Sessions',
                securityStatus: 'Security Status',
                accountActive: 'Account Active',
                highStrength: 'High Strength',
                mediumStrength: 'Medium Strength',
                securityTip: 'Bind both email and phone for higher security',
                quickActions: 'Quick Actions',
                changePassword: 'Change Password',
                bindNewAccount: 'Bind New Account',
                current: 'Current',
                revoke: 'Revoke',
                notBound: 'Not bound',
                editProfile: 'Edit Profile',
                bindEmail: 'Bind Email',
                bindPhone: 'Bind Phone',
                copyright: '© {{year}} UniAuth • Secured by Industry Standard Encryption',
                idCopied: 'ID copied to clipboard',
            },

            // Profile
            profile: {
                edit: 'Edit Profile',
                title: 'Edit Profile',
                nickname: 'Nickname',
                nicknamePlaceholder: 'Your nickname',
                avatarUrl: 'Avatar URL',
                avatarUrlPlaceholder: 'https://example.com/avatar.png',
                save: 'Save Changes',
                saving: 'Saving...',
                cancel: 'Cancel',
                saveSuccess: 'Profile updated successfully',
                saveFailed: 'Failed to update profile',
            },

            // Account Bindings
            bindings: {
                title: 'Account Bindings',
                phone: 'Phone Number',
                email: 'Email Address',
                oauth: 'Social Accounts',
                bound: 'Bound',
                notBound: 'Not Bound',
                bind: 'Bind',
                unbind: 'Unbind',
                bindPhone: 'Bind Phone',
                bindEmail: 'Bind Email',
                unbindConfirm: 'Are you sure you want to unbind {{provider}}?',
                unbindWarning: 'Make sure you have other login methods before unbinding.',
                cannotUnbind: 'Cannot unbind the only login method',
            },

            // Authorized Apps
            authorizedApps: {
                title: 'Authorized Applications',
                noApps: 'No applications authorized yet',
                authorizedOn: 'Authorized on {{date}}',
                lastUsed: 'Last used {{date}}',
                revoke: 'Revoke',
                revokeConfirm: 'Are you sure you want to revoke access for this application?',
            },

            // OAuth Scopes
            scopes: {
                openid: 'Basic Identity',
                profile: 'Profile',
                email: 'Email',
                phone: 'Phone',
            },

            // Security
            security: {
                securityScore: 'Security Score',
                excellent: 'Excellent',
                good: 'Good',
                needsImprovement: 'Needs Improvement',
                emailVerified: 'Email Verified',
                phoneVerified: 'Phone Verified',
                oauthLinked: 'Social Account Linked',
                mfaEnabled: 'Two-Factor Auth (MFA)',
            },

            // MFA
            mfa: {
                title: 'Two-Factor Authentication',
                enabled: 'Enabled',
                enable: 'Enable MFA',
                disable: 'Disable MFA',
                enabledDesc: 'Your account is protected with two-factor authentication.',
                disabledDesc: 'Add an extra layer of security to your account.',
                setupTitle: 'Set Up Two-Factor Authentication',
                setupSubtitle: 'Secure your account with TOTP',
                whatIsMFA: 'What is Two-Factor Authentication?',
                whatIsMFADesc: 'Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app when you sign in.',
                requirements: 'You will need an authenticator app:',
                otherApps: 'Or any other TOTP-compatible app',
                startSetup: 'Start Setup',
                scanQRCode: 'Scan this QR code with your authenticator app',
                manualEntry: 'Or enter this code manually:',
                next: 'Next',
                enterCode: 'Enter the 6-digit code from your authenticator app',
                verify: 'Verify',
                verifyFailed: 'Verification failed',
                setupFailed: 'Setup failed',
                invalidCode: 'Invalid verification code',
                saveRecoveryCodes: 'Save Your Recovery Codes',
                recoveryCodesDesc: 'If you lose access to your authenticator app, you can use these codes to sign in. Each code can only be used once.',
                copyRecoveryCodes: 'Copy All Codes',
                copied: 'Copied!',
                finishSetup: 'I have saved my codes',
                recoveryCodesRemaining: '{{count}} recovery codes remaining',
            },

            // Login History
            loginHistory: {
                title: 'Recent Logins',
                recent: '{{count}} sessions',
                noRecords: 'No login records',
                current: 'Current',
                today: 'Today',
                yesterday: 'Yesterday',
                daysAgo: '{{days}} days ago',
                showMore: 'Show more',
                showLess: 'Show less',
            },

            // Delete Account
            deleteAccount: {
                title: 'Delete Account',
                subtitle: 'This action cannot be undone',
                warningTitle: 'What will happen:',
                warning1: 'All your personal data will be permanently deleted',
                warning2: 'All linked accounts (Google, GitHub, etc.) will be unlinked',
                warning3: 'You will lose access to all authorized applications',
                confirmLabel: 'Type "DELETE" to confirm',
                confirmError: 'Please type DELETE to confirm',
                confirmButton: 'Delete My Account',
                failed: 'Failed to delete account',
            },

            // Passkey
            passkey: {
                title: 'Passkeys',
                description: 'Use Face ID, fingerprint, or your device PIN for passwordless login.',
                addPasskey: 'Add Passkey',
                noPasskeys: 'No passkeys registered yet',
                defaultDeviceName: 'My Passkey',
                deviceNamePlaceholder: 'e.g., MacBook Pro, iPhone',
                register: 'Register',
                registering: 'Registering...',
                registerSuccess: 'Passkey registered successfully',
                registerError: 'Failed to register passkey',
                deleteConfirm: 'Are you sure you want to delete this passkey?',
                deleteSuccess: 'Passkey deleted',
                deleteError: 'Failed to delete passkey',
                notSupported: 'Passkeys are not supported on this device or browser.',
                unnamed: 'Unnamed Passkey',
                addedOn: 'Added',
                lastUsed: 'Last used',
            },
        },
    },
    zh: {
        translation: {
            // Common
            common: {
                back: '返回',
                loading: '加载中...',
                save: '保存',
                cancel: '取消',
                confirm: '确认',
            },

            // General
            appName: 'UniAuth',
            tagline: '一个账号，畅享所有服务',

            // Login Page
            login: {
                title: '欢迎回来',
                subtitle: '登录以继续',
                phone: '手机号',
                phonePlaceholder: '+86 138 0013 8000',
                phoneNumberPlaceholder: '请输入手机号',
                fullPhoneNumber: '完整号码',
                email: '邮箱',
                emailPlaceholder: 'you@example.com',
                nicknamePlaceholder: '昵称 (可选)',
                password: '密码',
                passwordPlaceholder: '请输入密码',
                code: '验证码',
                codePlaceholder: '请输入6位验证码',
                sendCode: '发送验证码',
                resendCode: '{{seconds}}秒后重发',
                codeSentTip: '验证码已发送到您的邮箱。',
                openInbox: '打开{{provider}}',
                signIn: '登录',
                signUp: '注册',
                or: '或',
                continueWith: '使用{{provider}}登录',
                noAccount: '还没有账号？',
                hasAccount: '已有账号？',
                forgotPassword: '忘记密码？',
                terms: '继续即表示您同意我们的',
                termsLink: '服务条款',
                privacyLink: '隐私政策',
                and: '和',
            },

            // Tabs
            tabs: {
                phone: '手机号',
                email: '邮箱',
            },

            // Errors
            errors: {
                invalidPhone: '请输入有效的手机号',
                invalidEmail: '请输入有效的邮箱',
                invalidCode: '请输入6位验证码',
                invalidPassword: '密码至少8个字符',
                sendCodeFailed: '验证码发送失败',
                loginFailed: '登录失败，请重试',
                networkError: '网络错误，请检查连接',
            },

            // Success
            success: {
                codeSent: '验证码已发送',
                loginSuccess: '登录成功',
            },

            // OAuth Providers
            providers: {
                google: 'Google',
                github: 'GitHub',
                wechat: '微信',
                apple: 'Apple',
            },

            // Email Verification
            emailVerify: {
                title: '验证您的邮箱',
                subtitle: '我们已发送验证码到',
                verify: '验证邮箱',
                resend: '重新发送',
                sendFailed: '验证码发送失败',
                verifyFailed: '验证失败，请重试',
                successTitle: '邮箱验证成功！',
                successMessage: '您的邮箱已成功验证。',
                info: '验证码将在5分钟后过期',
            },

            // Home Page
            home: {
                signOut: '退出登录',
                activeSessions: '活跃会话',
                securityStatus: '安全状态',
                accountActive: '账户正常',
                highStrength: '安全等级高',
                mediumStrength: '安全等级中',
                securityTip: '同时绑定邮箱和手机可提高账户安全性',
                quickActions: '快捷操作',
                changePassword: '修改密码',
                bindNewAccount: '绑定新账户',
                current: '当前设备',
                revoke: '移除',
                notBound: '未绑定',
                editProfile: '编辑资料',
                bindEmail: '绑定邮箱',
                bindPhone: '绑定手机',
                copyright: '© {{year}} UniAuth · 采用行业标准加密技术保护',
                idCopied: 'ID 已复制到剪贴板',
            },

            // Profile
            profile: {
                edit: '编辑资料',
                title: '编辑个人资料',
                nickname: '昵称',
                nicknamePlaceholder: '请输入昵称',
                avatarUrl: '头像链接',
                avatarUrlPlaceholder: 'https://example.com/avatar.png',
                save: '保存修改',
                saving: '保存中...',
                cancel: '取消',
                saveSuccess: '资料更新成功',
                saveFailed: '资料更新失败',
            },

            // Account Bindings
            bindings: {
                title: '账号绑定',
                phone: '手机号',
                email: '邮箱地址',
                oauth: '社交账号',
                bound: '已绑定',
                notBound: '未绑定',
                bind: '绑定',
                unbind: '解除绑定',
                bindPhone: '绑定手机',
                bindEmail: '绑定邮箱',
                unbindConfirm: '确定要解绑 {{provider}} 吗？',
                unbindWarning: '解绑前请确保您有其他登录方式。',
                cannotUnbind: '无法解绑唯一的登录方式',
            },

            // Authorized Apps
            authorizedApps: {
                title: '已授权应用',
                noApps: '暂无授权应用',
                authorizedOn: '授权于 {{date}}',
                lastUsed: '最后使用 {{date}}',
                revoke: '撤销',
                revokeConfirm: '确定要撤销该应用的访问权限吗？',
            },

            // OAuth Scopes
            scopes: {
                openid: '基础身份',
                profile: '个人资料',
                email: '邮箱',
                phone: '手机号',
            },

            // Security
            security: {
                securityScore: '安全评分',
                excellent: '安全性极佳',
                good: '安全性良好',
                needsImprovement: '需要提升',
                emailVerified: '邮箱已验证',
                phoneVerified: '手机已验证',
                oauthLinked: '社交账号已关联',
                mfaEnabled: '双因素认证 (MFA)',
            },

            // MFA
            mfa: {
                title: '双因素认证',
                enabled: '已启用',
                enable: '启用 MFA',
                disable: '禁用 MFA',
                enabledDesc: '您的账户已受双因素认证保护。',
                disabledDesc: '为您的账户添加额外的安全保护。',
                setupTitle: '设置双因素认证',
                setupSubtitle: '使用 TOTP 保护您的账户',
                whatIsMFA: '什么是双因素认证？',
                whatIsMFADesc: '双因素认证在登录时需要验证器应用提供的验证码，为您的账户增加额外的安全保护。',
                requirements: '您需要一个验证器应用：',
                otherApps: '或其他支持 TOTP 的应用',
                startSetup: '开始设置',
                scanQRCode: '使用验证器应用扫描此二维码',
                manualEntry: '或手动输入此密钥：',
                next: '下一步',
                enterCode: '输入验证器应用中的6位验证码',
                verify: '验证',
                verifyFailed: '验证失败',
                setupFailed: '设置失败',
                invalidCode: '验证码错误',
                saveRecoveryCodes: '保存您的恢复码',
                recoveryCodesDesc: '如果您无法访问验证器应用，可以使用这些恢复码登录。每个恢复码只能使用一次。',
                copyRecoveryCodes: '复制所有恢复码',
                copied: '已复制！',
                finishSetup: '我已保存恢复码',
                recoveryCodesRemaining: '剩余 {{count}} 个恢复码',
            },

            // Login History
            loginHistory: {
                title: '最近登录',
                recent: '{{count}} 个会话',
                noRecords: '暂无登录记录',
                current: '当前',
                today: '今天',
                yesterday: '昨天',
                daysAgo: '{{days}} 天前',
                showMore: '显示更多',
                showLess: '收起',
            },

            // Delete Account
            deleteAccount: {
                title: '删除账户',
                subtitle: '此操作无法撤销',
                warningTitle: '将会发生的事情：',
                warning1: '您的所有个人数据将被永久删除',
                warning2: '所有关联账号（Google、GitHub 等）将被解除绑定',
                warning3: '您将失去对所有已授权应用的访问权限',
                confirmLabel: '输入 "DELETE" 确认',
                confirmError: '请输入 DELETE 确认',
                confirmButton: '删除我的账户',
                failed: '账户删除失败',
            },

            // Passkey
            passkey: {
                title: '通行密钥',
                description: '使用 Face ID、指纹或设备 PIN 进行无密码登录。',
                addPasskey: '添加通行密钥',
                noPasskeys: '尚未注册通行密钥',
                defaultDeviceName: '我的通行密钥',
                deviceNamePlaceholder: '例如：MacBook Pro、iPhone',
                register: '注册',
                registering: '注册中...',
                registerSuccess: '通行密钥注册成功',
                registerError: '通行密钥注册失败',
                deleteConfirm: '确定要删除此通行密钥吗？',
                deleteSuccess: '通行密钥已删除',
                deleteError: '删除通行密钥失败',
                notSupported: '当前设备或浏览器不支持通行密钥。',
                unnamed: '未命名通行密钥',
                addedOn: '添加于',
                lastUsed: '最后使用',
            },
        },
    },
};
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['navigator', 'localStorage', 'htmlTag'],
            caches: ['localStorage'],
        },
    });

export default i18n;
