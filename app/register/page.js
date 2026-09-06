'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">{CONFIG.SITE_NAME}</h1>
          <p className="text-gray-500 mt-2">注册账号</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">暂不开放自助注册</h2>
            <p className="text-sm text-gray-500 mb-6">
              本邮箱服务采用邀请制，如需开通账号，请联系管理员获取注册码或由管理员直接为您创建账号。
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-600 mb-6">
              <p className="font-medium text-gray-700 mb-2">开通方式：</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>联系管理员获取注册码</li>
                <li>由管理员在后台直接添加账号</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/login" className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition text-center shadow-md">
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
