import React from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';

const Page = () => {
  return (
    <BackgroundLayout>
      <div className="flex items-center justify-center relative z-10">
        <div className="container text-center px-6 py-20">
          <p className="text-muted-foreground">Page de test - Fond et animations</p>
        </div>
      </div>
    </BackgroundLayout>
  );
};

export default Page;
