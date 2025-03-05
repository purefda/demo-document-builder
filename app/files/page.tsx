import { FilesList } from "../../components/files/files-list";
import { FileUpload } from "../../components/files/file-upload";

export default function FilesPage() {
  return (
    <div className="container px-6 py-8 mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-title font-bold mb-6 text-deep-purple">Files Management</h1>
        
        <div className="mb-8">
          <FileUpload />
        </div>
        
        <div>
          <FilesList />
        </div>
      </div>
    </div>
  );
} 