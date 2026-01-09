import { emitEvent, mockTelegramEnv } from '@tma.js/sdk-react';

export function initMockDevData() {
    sessionStorage.removeItem('tapps/launchParams');

    const mockThemeParams = {
        accent_text_color: '#6ab2f2',
        bg_color: '#17212b',
        button_color: '#5288c1',
        button_text_color: '#ffffff',
        destructive_text_color: '#ec3942',
        header_bg_color: '#17212b',
        hint_color: '#708499',
        link_color: '#6ab3f3',
        secondary_bg_color: '#232e3c',
        section_bg_color: '#17212b',
        section_header_text_color: '#6ab3f3',
        subtitle_text_color: '#708499',
        text_color: '#f5f5f5',
    } as const;

    mockTelegramEnv({
        launchParams: {
            tgWebAppThemeParams: mockThemeParams,
            tgWebAppData: new URLSearchParams([
                [
                    'user',
                    JSON.stringify({
                        id: 5002632805,
                        first_name: 'Developer',
                        last_name: 'Account',
                        language_code: 'en',
                        photo_url: 'https://t.me/i/userpic/320/monk.jpg',
                        username: 'dev_account',
                    }),
                ],
                ['hash', 'HASH'],
                // ['start_param', '5033155318'],
                ['signature', 'SIGNATURE'],
                ['auth_date', Date.now().toString()],
            ]),
            tgWebAppStartParam: '',
            tgWebAppVersion: '8',
            tgWebAppPlatform: 'tdesktop',
        },
        onEvent: (event, next) => {
            if (event.name === 'web_app_share_to_story') {
                console.log('event', event);
                console.log('📸 Mock: Story share dialog opened');
                const params = event.params as { media_url?: string };
                window.open(params.media_url, '_blank');
                next();
                return;
            } else if (event.name === 'web_app_open_tg_link') {
                console.log('🔗 Mock: Opening Telegram link');
                const params = event.params as { path_full?: string };
                if (params?.path_full) {
                    const url = `https://t.me${params.path_full}`;
                    console.log('   URL:', url);
                    window.open(url, '_blank');
                }
                next();
                return;
            } else if (event.name === 'web_app_open_link') {
                console.log('🔗 Mock: Opening link');
                const params = event.params as { url?: string };
                if (params?.url) {
                    console.log('   URL:', params.url);
                    window.open(params.url, '_blank');
                }
                next();
                return;
            } else if (event.name === 'web_app_check_home_screen') {
                console.log('🏠 Mock: Checking home screen status');
                setTimeout(() => {
                    emitEvent('home_screen_checked', {
                        status: 'missed',
                    });
                }, 100);
                next();
                return;
            } else if (event.name === 'web_app_add_to_home_screen') {
                console.log('🏠 Mock: Adding to home screen');
                setTimeout(() => {
                    emitEvent('home_screen_added');
                }, 500);
                next();
                return;
            } else if (event.name === 'web_app_request_write_access') {
                console.log('✉️ Mock: Requesting write access');
                emitEvent('write_access_requested', {
                    status: 'allowed',
                });
                next();
                return;
            }
            console.log(event);

            next();
        },
    });
}
