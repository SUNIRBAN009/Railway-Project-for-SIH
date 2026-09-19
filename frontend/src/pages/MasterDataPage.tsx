import React from 'react';
import { ControlRoomLayout } from '../layouts/ControlRoomLayout';
import { MasterDataInspector } from '../components/admin/MasterDataInspector';

export const MasterDataPage: React.FC = () => {
  return (
    <ControlRoomLayout>
      <MasterDataInspector />
    </ControlRoomLayout>
  );
};
