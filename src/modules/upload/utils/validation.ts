export function validateResume(file: File) {

    if(file.type!=="application/pdf"){

        return "Only PDF files are allowed.";

    }

    if(file.size>5*1024*1024){

        return "Maximum size is 5MB.";

    }

    return null;

}