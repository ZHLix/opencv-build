local Platform(name='linux') = {
  local map = {
    linux: {
      os: 'linux',
      arch: 'amd64',
    },
    windows: {
      os: 'windows',
      arch: 'amd64',
      version: '1903',
    },
    darwin: {
      os: 'darwin',
      arch: 'amd64',
    },
  },
  os: map[name].os,
  arch: map[name].arch,
  version: if name == 'windows' then map[name].version else '',
};

local Pipeline(name, type='docker', platform='linux', image) = {
  kind: 'pipeline',
  name: name,
  type: type,
  platform: Platform(platform),
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
        'yarn prepublishOnly',
        'npm run install',  // 执行编译
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
        base_url: 'https://192.168.68.254:7100',
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
  Pipeline('node14', 'docker', 'linux', 'node:14'),
  Pipeline('node16', 'docker', 'linux', 'node:16'),
]
