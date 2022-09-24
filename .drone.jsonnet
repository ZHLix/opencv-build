local PlaformWithLinux = {
  os: 'linux',
  arch: 'amd64',
};
local PlaformWithMacOS = {
  os: 'darwin',
  arch: 'amd64',
};
local PlaformWithWindows = {
  os: 'windows',
  arch: 'amd64',
  version: '1903',
};

local Pipeline(name, type='docker', platform='linux', image) = {
  local platform_1 = if platform == 'darwin' then PlaformWithMacOS else if platform == 'windows' then PlaformWithWindows else PlaformWithLinux,
  kind: 'pipeline',
  name: name,
  type: type,
  platform: platform_1,
  steps: [
    {
      name: 'build',
      image: image,
      environment: {
        REGISTRY: {
          from_secret: 'npm-registry',
        },
        TOKEN: {
          from_secret: 'npm-token',
        },
      },
      commands: [
        'npm config set registry $REGISTRY',  // 切换淘宝镜像
        'npm config set $TOKEN',
        "sed -i -e 's/deb.debian.org/mirrors.huaweicloud.com/g' -e 's/security.debian.org/mirrors.huaweicloud.com/g' /etc/apt/sources.list",
        'apt update',
        'apt install cmake -y',
        'npm install',  // 安装node_modules包
        'npm run package',
      ],
    },
    {
      name: 'gitea_release',
      image: 'plugins/gitea-release',
      depends_on: ['build'],
      settings: {
        api_key: {
          from_secret: 'gitea-token',
        },
        insecure: true,
        base_url: 'http://192.168.68.254:7100',
        files: 'build/state/*/*',
      },
    },
  ],
  trigger: {
    event: [
      'tag',
    ],
  },
};

[
  Pipeline('node16', 'docker', 'windows', 'node:16'),
  Pipeline('node16', 'docker', 'linux', 'node:16'),
]
