import { File06, Image04, Recording01, VideoRecorder, LinkBroken02 } from '@untitledui/icons';

export const FileIcon = ({ file }: { file: File | null }) => {
    if (file) {
        const fileType = file.type;

        if (fileType.startsWith('image/')) {
          return <Image04 className="w-5 h-5 text-orange-500"/>
        }
   
        if (fileType.startsWith('video/')) {
          return <VideoRecorder className="w-5 h-5 text-orange-500" />;
        }
      
        if (fileType.startsWith('audio/')) {
          return <Recording01 className="w-5 h-5 text-orange-500" />;
        }
      
        return <File06 className="w-5 h-5 text-orange-500" />;
    } else {
        return <LinkBroken02 className="w-5 h-5 text-orange-500" />
    }
};